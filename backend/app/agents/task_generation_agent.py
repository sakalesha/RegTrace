import os
import asyncio
import json
import re
import logging
from typing import Any, List, Dict
from groq import Groq, RateLimitError, APIConnectionError, APITimeoutError, APIStatusError
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type, before_sleep_log

from app.agents.base_agent import BaseAgent
from app.schemas.task import LLMTaskGeneration, LLMBatchTaskGeneration, LLMBatchObligation, TaskCategory, TaskPriority, TaskRecurrence, Department
from app.models.obligation import ObligationModel

_logger = logging.getLogger("pipeline.groq")


def _log_retry(retry_state) -> None:
    _logger.warning("Groq call failed (attempt %d): %s — retrying in %.0fs",
                    retry_state.attempt_number,
                    type(retry_state.outcome.exception()).__name__,
                    retry_state.next_action.sleep)


def _normalize_enum(value: Any, enum_cls: Any) -> Any:
    """Coerce a free-form LLM string onto the closest enum member's exact value."""
    if not isinstance(value, str):
        return value
    target = re.sub(r"[\s\-_/]+", " ", value.strip().lower())
    normalized = {member: re.sub(r"[\s\-_/]+", " ", member.value.lower()) for member in enum_cls}

    # Exact normalized match first.
    for member, allowed in normalized.items():
        if target == allowed:
            return member.value

    # Fall back to best substring/prefix match (e.g. "Continuous" -> "Continuous
    # Monitoring", "KYC" -> "KYC/Client Onboarding").
    best = None
    best_len = 0
    for member, allowed in normalized.items():
        if target and (target in allowed or allowed in target):
            score = len(target) if target in allowed else len(allowed)
            if score > best_len:
                best = member
                best_len = score
    return best.value if best else value


def _sanitize_task(task: dict) -> dict:
    """Normalize enum-valued and mistyped fields before strict pydantic validation."""
    task = dict(task)
    task["category"] = _normalize_enum(task.get("category"), TaskCategory)
    task["priority"] = _normalize_enum(task.get("priority"), TaskPriority)
    task["recurrence"] = _normalize_enum(task.get("recurrence"), TaskRecurrence)
    task["recommended_owner"] = _normalize_enum(task.get("recommended_owner"), Department)

    # page_number may arrive as a numeric string; coerce to int/None.
    page_number = task.get("page_number")
    if isinstance(page_number, str):
        page_number = page_number.strip()
        task["page_number"] = int(page_number) if page_number else None

    # evidence_required may arrive as a single string instead of a list.
    evidence = task.get("evidence_required")
    if isinstance(evidence, str):
        task["evidence_required"] = [evidence]
    elif not isinstance(evidence, list):
        task["evidence_required"] = []

    # The model occasionally uses a singular "task" key; promote it.
    return task


def _sanitize_payload(data: Any) -> Any:
    if isinstance(data, dict):
        if "tasks" not in data and "task" in data:
            data["tasks"] = data.pop("task")
        if isinstance(data.get("tasks"), list):
            data["tasks"] = [_sanitize_task(t) for t in data["tasks"] if isinstance(t, dict)]
        # Batch form: {"obligations": [{obligation_id, tasks: [...]}]}
        if isinstance(data.get("obligations"), list):
            for ob in data["obligations"]:
                if not isinstance(ob, dict):
                    continue
                if "tasks" not in ob and "task" in ob:
                    ob["tasks"] = ob.pop("task")
                if isinstance(ob.get("tasks"), list):
                    ob["tasks"] = [_sanitize_task(t) for t in ob["tasks"] if isinstance(t, dict)]
    return data


class TaskGenerationAgent(BaseAgent):
    """
    Agent that uses Groq to convert an approved regulatory obligation into one
    or more structured, operational compliance tasks.
    """

    def __init__(self):
        self.client = Groq(api_key=os.environ.get("GROQ_API_KEY"))
        # llama-3.3-70b-versatile: higher quality task decomposition + 2x token rate.
        self.model = "llama-3.3-70b-versatile"

    async def validate(self, input_data: ObligationModel):
        if not isinstance(input_data, ObligationModel):
            raise ValueError("Input data must be an ObligationModel.")

    @retry(
        retry=retry_if_exception_type((RateLimitError, APIConnectionError, APITimeoutError, APIStatusError)),
        stop=stop_after_attempt(10),
        wait=wait_exponential(multiplier=2, min=4, max=120),
        reraise=True,
        before_sleep=_log_retry,
    )
    def _call_groq(self, obligation: ObligationModel) -> LLMTaskGeneration:
        """
        Synchronous call wrapped with tenacity for rate limiting and backoff.
        """
        prompt = f"""
        You are a senior regulatory compliance operations expert for a SEBI-registered stock broker.
        Convert the following approved regulatory obligation into one or more concrete, executable
        operational compliance tasks.

        Obligation details:
        - Actor: {obligation.actor}
        - Action: {obligation.action}
        - Condition: {obligation.condition or "none"}
        - Deadline: {obligation.deadline or "none"}
        - Frequency: {obligation.frequency or "none"}
        - Mandatory: {obligation.is_mandatory}

        Rules:
        - Decompose a single obligation into separate tasks when it requires multiple independent
          operational steps (e.g., data collection, validation, preparation, submission, preservation).
        - `title`: short actionable title (imperative verb phrase).
        - `description`: concrete steps the operations team must perform.
        - `category`: one of [Reporting, Record Keeping, Audit, Grievance Redressal, Cybersecurity,
          Disclosure, Monitoring, Governance, Operational Compliance].
        - `priority`: Critical if time-sensitive with regulatory impact, otherwise High/Medium/Low.
        - `due_rule`: convert the deadline into an operational rule (e.g., "Within seven working days of
          event", "Monthly", "Quarterly"). Use null if no deadline applies.
        - `recurrence`: one of [One-time, Event-based, Monthly, Quarterly, Half-yearly, Annual,
          Continuous Monitoring].
        - `evidence_required`: list the documentary evidence needed to prove compliance (e.g., audit
          report, client ledger, regulatory submission receipt, board resolution, policy document,
          screenshot, system log, complaint resolution record).
        - `clause_reference` and `page_number`: carry forward from the obligation where available.
        - `recommended_owner`: suggest the most fitting department from
          [Compliance, Operations, KYC/Client Onboarding, IT, Information Security, Finance, Legal, Risk].

        Return ONLY valid JSON matching this schema exactly:
        {{
            "tasks": [
                {{
                    "title": "string",
                    "description": "string",
                    "category": "string",
                    "priority": "string",
                    "due_rule": "string or null",
                    "recurrence": "string",
                    "evidence_required": ["string"],
                    "clause_reference": "string or null",
                    "page_number": integer or null,
                    "recommended_owner": "string"
                }}
            ]
        }}
        """

        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": "You are a JSON-only response bot. You must return a valid JSON object containing the 'tasks' key."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.0
        )

        json_content = response.choices[0].message.content
        payload = json.loads(json_content)
        payload = _sanitize_payload(payload)
        return LLMTaskGeneration.model_validate(payload)

    async def process(self, input_data: ObligationModel) -> LLMTaskGeneration:
        loop = asyncio.get_event_loop()
        parsed_output = await loop.run_in_executor(None, self._call_groq, input_data)
        return parsed_output

    @retry(
        retry=retry_if_exception_type((RateLimitError, APIConnectionError, APITimeoutError, APIStatusError)),
        stop=stop_after_attempt(10),
        wait=wait_exponential(multiplier=2, min=4, max=120),
        reraise=True,
        before_sleep=_log_retry,
    )
    def _call_groq_batch(self, batch: List[Dict[str, Any]]) -> LLMBatchTaskGeneration:
        """
        Synchronous batched call: one Groq request for multiple obligations.

        ``batch`` is a list of obligation dicts (ObligationModel-compatible).
        Returns per-obligation tasks keyed by obligation_id.
        """
        numbered = "\n\n".join(
            f"[OBLIGATION {i}]\nID: {ob['obligation_id']}\n"
            f"Actor: {ob.get('actor')}\n"
            f"Action: {ob.get('action')}\n"
            f"Condition: {ob.get('condition') or 'none'}\n"
            f"Deadline: {ob.get('deadline') or 'none'}\n"
            f"Frequency: {ob.get('frequency') or 'none'}\n"
            f"Mandatory: {ob.get('is_mandatory')}"
            for i, ob in enumerate(batch, start=1)
        )
        prompt = f"""
        You are a senior regulatory compliance operations expert for a SEBI-registered stock broker.
        For EACH obligation below, convert it into one or more concrete, executable operational
        compliance tasks. Process each obligation independently.

        Rules:
        - Decompose a single obligation into separate tasks when it requires multiple independent
          operational steps (e.g., data collection, validation, preparation, submission, preservation).
        - `title`: short actionable title (imperative verb phrase).
        - `description`: concrete steps the operations team must perform.
        - `category`: one of [Reporting, Record Keeping, Audit, Grievance Redressal, Cybersecurity,
          Disclosure, Monitoring, Governance, Operational Compliance].
        - `priority`: Critical if time-sensitive with regulatory impact, otherwise High/Medium/Low.
        - `due_rule`: convert the deadline into an operational rule (e.g., "Within seven working days of
          event", "Monthly", "Quarterly"). Use null if no deadline applies.
        - `recurrence`: one of [One-time, Event-based, Monthly, Quarterly, Half-yearly, Annual,
          Continuous Monitoring].
        - `evidence_required`: list the documentary evidence needed to prove compliance (e.g., audit
          report, client ledger, regulatory submission receipt, board resolution, policy document,
          screenshot, system log, complaint resolution record).
        - `recommended_owner`: suggest the most fitting department from
          [Compliance, Operations, KYC/Client Onboarding, IT, Information Security, Finance, Legal, Risk].
        - Set `clause_reference` and `page_number` to null (the service backfills them).

        Obligations:
        {numbered}

        Return ONLY valid JSON that matches this schema exactly:
        {{
            "obligations": [
                {{
                    "obligation_id": "the exact ID from above",
                    "tasks": [
                        {{
                            "title": "string",
                            "description": "string",
                            "category": "string",
                            "priority": "string",
                            "due_rule": "string or null",
                            "recurrence": "string",
                            "evidence_required": ["string"],
                            "clause_reference": null,
                            "page_number": null,
                            "recommended_owner": "string"
                        }}
                    ]
                }}
            ]
        }}

        Return an entry for EVERY obligation listed above, even if its tasks list is empty.
        """

        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": "You are a JSON-only response bot. You must return a valid JSON object containing the 'obligations' key."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.0
        )

        json_content = response.choices[0].message.content
        payload = json.loads(json_content)
        payload = _sanitize_payload(payload)
        return LLMBatchTaskGeneration.model_validate(payload)

    async def run_batch(self, batch: List[Dict[str, Any]]) -> Dict[str, LLMTaskGeneration]:
        """
        Process a batch of obligations in a single LLM call.

        Args:
            batch: list of dicts (ObligationModel-compatible) each with an 'obligation_id' key.

        Returns:
            dict mapping obligation_id -> LLMTaskGeneration (empty tasks if none).
        """
        loop = asyncio.get_event_loop()
        parsed = await loop.run_in_executor(None, self._call_groq_batch, batch)

        results: Dict[str, LLMTaskGeneration] = {}
        for ob in batch:
            results[ob["obligation_id"]] = LLMTaskGeneration(tasks=[])
        for entry in parsed.obligations:
            if entry.obligation_id in results:
                results[entry.obligation_id] = LLMTaskGeneration(tasks=entry.tasks)
        return results

    async def validate_output(self, output_data: Any):
        if not isinstance(output_data, LLMTaskGeneration):
            raise ValueError("Output must be of type LLMTaskGeneration")

    async def persist(self, output_data: Any):
        # Persistence is handled by the TaskService which maps and saves the DB models.
        pass