import os
import json
import logging
from typing import Any, Dict, List, Tuple
from groq import Groq, RateLimitError, APIConnectionError, APITimeoutError, APIStatusError
from pydantic import BaseModel
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type, before_sleep_log

from app.agents.base_agent import BaseAgent
from app.schemas.obligation import LLMObligationExtraction, LLMBatchExtraction, LLMBatchClause

_logger = logging.getLogger("pipeline.groq")


def _log_retry(retry_state) -> None:
    _logger.warning("Groq call failed (attempt %d): %s — retrying in %.0fs",
                    retry_state.attempt_number,
                    type(retry_state.outcome.exception()).__name__,
                    retry_state.next_action.sleep)

class ObligationExtractionAgent(BaseAgent):
    """
    Agent that uses Groq to extract structured obligations from legal clauses.
    """
    
    def __init__(self):
        # We assume GROQ_API_KEY is in the environment
        self.client = Groq(api_key=os.environ.get("GROQ_API_KEY"))
        # Use llama-3.3-70b-versatile for better extraction quality and a
        # 2x higher token rate (12K TPM vs 6K) so batches fill the window faster.
        self.model = "llama-3.3-70b-versatile" 

    async def validate(self, input_data: str):
        if not input_data or not isinstance(input_data, str):
            raise ValueError("Input data must be a valid text string representing the clause.")

    @retry(
        retry=retry_if_exception_type((RateLimitError, APIConnectionError, APITimeoutError, APIStatusError)),
        stop=stop_after_attempt(10),
        wait=wait_exponential(multiplier=2, min=4, max=120),
        reraise=True,
        before_sleep=_log_retry,
    )
    def _call_groq(self, text: str) -> LLMObligationExtraction:
        """
        Synchronous call wrapped with tenacity for rate limiting and backoff.
        """
        prompt = f"""
        You are a senior regulatory compliance expert analyzing a SEBI Master Circular.
        Extract all distinct, actionable obligations from the following clause text.

        Rules:
        - Only extract clear obligations. If the text is purely informational, a heading,
          a list lead-in that ends in a colon (e.g. "The audit shall cover, inter alia:"),
          a cross-reference, a definition, an explanation note, or a footnote, return an empty list.
          A fragment like "The inspection shall cover:" imposes no standalone requirement by itself.
        - Ignore footnote and reference material appended to the clause (e.g. "Reference: Circular
          ... dated ..."), quoted passages from prior circulars, and page-number artifacts.
        - Emit ONE obligation per (actor, requirement) pair. Coordinated verbs describing a single
          requirement for the same actor belong in one obligation (e.g. "analyze the audit reports
          and take appropriate follow up action" is ONE obligation; "carry out internal audit by an
          independent qualified auditor" is ONE obligation).
        - Emit SEPARATE obligations when: the actors differ; or one part carries a deadline,
          frequency, or condition the other lacks; or the parts are independently checkable
          requirements (e.g. "auditor submits report to member" / "member places it before the
          Board" / "member forwards it to the Exchange within two months" are THREE obligations).
        - Identify the `actor` (e.g., "Stock Broker", "Clearing Member"). Use the actor that the
          text actually requires; for passive statements use the entity that must perform the action.
        - Extract the `action` (e.g., "Name all new bank and demat accounts as per the prescribed nomenclature").
        - Extract the `condition` (e.g., "When opening a new bank or demat account", "At all times").
        - Identify any `deadline` (e.g., "Within one week of opening", "At the time of opening"). Return null if none.
        - **CRITICAL DEADLINE RULE**: When a sentence contains multiple coordinated obligations joined by "and", "or", or semicolons, assign deadlines ONLY to the obligation explicitly governed by the temporal phrase. Do not propagate a deadline from one obligation to another unless the text clearly applies it to both obligations.
          - *Example*: "Accounts shall be named as per the prescribed nomenclature and details shall be communicated within one week."
          - *Correct Extraction*:
            1) Name accounts (deadline: null)
            2) Communicate details (deadline: "Within one week")
        - Extract the `frequency` (e.g., "Event-driven", "Continuous", "Half-yearly"). If the text gives no recurring cadence, return null.
        - Assign a `confidence_score` between 0.0 and 1.0 based on how clear and explicit the obligation is.
        - Set `is_mandatory` to true if it uses words like "shall", "must", "is required to".

        Clause text:
        {text}

        Return ONLY valid JSON that matches this schema exactly:
        {{
            "obligations": [
                {{
                    "actor": "string",
                    "action": "string",
                    "condition": "string or null",
                    "deadline": "string or null",
                    "frequency": "string or null",
                    "is_mandatory": boolean,
                    "confidence_score": float
                }}
            ]
        }}
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
        return LLMObligationExtraction.model_validate_json(json_content)

    async def process(self, input_data: str) -> LLMObligationExtraction:
        import asyncio
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
    def _call_groq_batch(self, batch: List[Dict[str, Any]]) -> LLMBatchExtraction:
        """
        Synchronous batched call: one Groq request for multiple clauses.

        ``batch`` is a list of ``{"clause_id": ..., "text": ...}``. Returns
        per-clause obligations keyed by clause_id so results map back cleanly.
        """
        numbered = "\n\n".join(
            f"[CLAUSE {i}]\nID: {c['clause_id']}\nTEXT: {c['text']}"
            for i, c in enumerate(batch, start=1)
        )
        prompt = f"""
        You are a senior regulatory compliance expert analyzing clauses from a SEBI Master Circular.
        For EACH clause below, extract all distinct, actionable obligations.

        Rules (apply per clause independently):
        - Only extract clear obligations. If a clause is purely informational, a heading,
          a list lead-in that ends in a colon (e.g. "The audit shall cover, inter alia:"),
          a cross-reference, a definition, an explanation note, or a footnote, return an empty list.
          A fragment like "The inspection shall cover:" imposes no standalone requirement by itself.
        - Ignore footnote and reference material appended to the clause (e.g. "Reference: Circular
          ... dated ..."), quoted passages from prior circulars, and page-number artifacts.
        - Emit ONE obligation per (actor, requirement) pair. Coordinated verbs describing a single
          requirement for the same actor belong in one obligation (e.g. "analyze the audit reports
          and take appropriate follow up action" is ONE obligation; "carry out internal audit by an
          independent qualified auditor" is ONE obligation).
        - Emit SEPARATE obligations when: the actors differ; or one part carries a deadline,
          frequency, or condition the other lacks; or the parts are independently checkable
          requirements (e.g. "auditor submits report to member" / "member places it before the
          Board" / "member forwards it to the Exchange within two months" are THREE obligations).
        - Identify the `actor` (e.g., "Stock Broker", "Clearing Member"). Use the actor that the
          text actually requires; for passive statements use the entity that must perform the action.
        - Extract the `action` (e.g., "Name all new bank and demat accounts as per the prescribed nomenclature").
        - Extract the `condition` (e.g., "When opening a new bank or demat account", "At all times").
        - Identify any `deadline` (e.g., "Within one week of opening", "At the time of opening"). Return null if none.
        - **CRITICAL DEADLINE RULE**: When a sentence contains multiple coordinated obligations joined by "and", "or", or semicolons, assign deadlines ONLY to the obligation explicitly governed by the temporal phrase. Do not propagate a deadline from one obligation to another unless the text clearly applies it to both obligations.
          - *Example*: "Accounts shall be named as per the prescribed nomenclature and details shall be communicated within one week."
          - *Correct Extraction*:
            1) Name accounts (deadline: null)
            2) Communicate details (deadline: "Within one week")
        - Extract the `frequency` (e.g., "Event-driven", "Continuous", "Half-yearly"). If the text gives no recurring cadence, return null.
        - Assign a `confidence_score` between 0.0 and 1.0 based on how clear and explicit the obligation is.
        - Set `is_mandatory` to true if it uses words like "shall", "must", "is required to".

        Clauses:
        {numbered}

        Return ONLY valid JSON that matches this schema exactly:
        {{
            "clauses": [
                {{
                    "clause_id": "the exact clause ID from above",
                    "obligations": [
                        {{
                            "actor": "string",
                            "action": "string",
                            "condition": "string or null",
                            "deadline": "string or null",
                            "frequency": "string or null",
                            "is_mandatory": boolean,
                            "confidence_score": float
                        }}
                    ]
                }}
            ]
        }}

        Return an entry for EVERY clause listed above, even if its obligations list is empty.
        """

        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": "You are a JSON-only response bot. You must return a valid JSON object containing the 'clauses' key."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.0,
        )

        json_content = response.choices[0].message.content
        return LLMBatchExtraction.model_validate_json(json_content)

    async def run_batch(self, batch: List[Dict[str, Any]]) -> Dict[str, LLMObligationExtraction]:
        """
        Process a batch of clauses in a single LLM call.

        Args:
            batch: list of {"clause_id": str, "text": str}

        Returns:
            dict mapping clause_id -> LLMObligationExtraction (empty obligations if none).
        """
        import asyncio
        loop = asyncio.get_event_loop()
        parsed = await loop.run_in_executor(None, self._call_groq_batch, batch)

        results: Dict[str, LLMObligationExtraction] = {}
        for c in batch:
            results[c["clause_id"]] = LLMObligationExtraction(obligations=[])
        for entry in parsed.clauses:
            if entry.clause_id in results:
                results[entry.clause_id] = LLMObligationExtraction(obligations=entry.obligations)
        return results

    async def validate_output(self, output_data: Any):
        if not isinstance(output_data, LLMObligationExtraction):
            raise ValueError("Output must be of type LLMObligationExtraction")

    async def persist(self, output_data: Any):
        # We skip persisting inside the agent as the Service will map and save the DB models directly
        pass
