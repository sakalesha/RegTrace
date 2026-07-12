import uuid
import asyncio
from shared.database.mongodb import get_db
from shared.schemas.pipeline import ExecutionContext
from shared.schemas.evaluation import ComplianceEvaluationResult, ComplianceEvaluationRecord
from agents.base import BaseAgent
from shared.services.llm import LLMService
from shared.prompts.evaluation_prompt import EVALUATION_SYSTEM_PROMPT, EVALUATION_HUMAN_PROMPT
from shared.services.logger import Logger

class ComplianceEvaluationAgent(BaseAgent):

    @classmethod
    async def execute(cls, context: ExecutionContext) -> ExecutionContext:
        document_id = context.document_id
        Logger.info("ComplianceEvaluationAgent", f"Started for {document_id}")
        db = get_db()
        
        # 1. Fetch assigned tasks
        tasks = await db.compliance_tasks.find({"document_id": document_id, "status": "ASSIGNED"}).to_list(length=None)
        if not tasks:
            return context
            
        # 2. Fetch evidence
        all_evidence = await db.evidence.find({"task_id": {"$in": [t["task_id"] for t in tasks]}}).to_list(length=None)
        evidence_by_task = {}
        for ev in all_evidence:
            tid = ev["task_id"]
            if tid not in evidence_by_task:
                evidence_by_task[tid] = []
            evidence_by_task[tid].append(ev)
            
        all_evaluations = []
        
        async def evaluate_task(task):
            ev_list = evidence_by_task.get(task["task_id"], [])
            
            if not ev_list:
                # Fast track: No evidence -> NON_COMPLIANT
                return ComplianceEvaluationRecord(
                    evaluation_id=f"EVL-{uuid.uuid4().hex[:8].upper()}",
                    task_id=task["task_id"],
                    document_id=document_id,
                    status="NON_COMPLIANT",
                    confidence=1.0,
                    reason="No evidence was found or provided.",
                    missing_requirements=[task.get("required_evidence", "Any evidence")],
                    recommended_actions=[f"Upload {task.get('required_evidence')}"]
                ).model_dump()
                
            evidence_text = "\n---\n".join([f"Source: {e.get('source_name')}\nText: {e.get('matched_text')}" for e in ev_list])
            
            try:
                result = await LLMService.generate_structured(
                    system_prompt=EVALUATION_SYSTEM_PROMPT,
                    human_prompt=EVALUATION_HUMAN_PROMPT,
                    schema=ComplianceEvaluationResult,
                    input_vars={
                        "title": task.get("title", ""),
                        "description": task.get("description", ""),
                        "required_evidence": task.get("required_evidence", ""),
                        "evidence_text": evidence_text
                    }
                )
                
                doc = result.model_dump()
                doc["evaluation_id"] = f"EVL-{uuid.uuid4().hex[:8].upper()}",
                doc["task_id"] = task["task_id"]
                doc["document_id"] = document_id
                return doc
            except Exception as e:
                Logger.error("ComplianceEvaluationAgent", f"Evaluation failed for task {task['task_id']}", exc=e)
                return None
                
        results = await asyncio.gather(*[evaluate_task(t) for t in tasks])
        all_evaluations = [r for r in results if r]
        
        if all_evaluations:
            await db.evaluations.insert_many(all_evaluations)
            
        Logger.info("ComplianceEvaluationAgent", f"Finished for {document_id}. Evaluated {len(all_evaluations)} tasks.")
        return context
