import uuid
from shared.database.mongodb import get_db
from shared.schemas.pipeline import ExecutionContext
from shared.schemas.gap import GapRecord
from agents.base import BaseAgent
from shared.services.logger import Logger

class GapAnalysisAgent(BaseAgent):

    @classmethod
    async def execute(cls, context: ExecutionContext) -> ExecutionContext:
        document_id = context.document_id
        Logger.info("GapAnalysisAgent", f"Started for {document_id}")
        db = get_db()
        
        evaluations = await db.evaluations.find({"document_id": document_id}).to_list(length=None)
        if not evaluations:
            return context
            
        tasks = await db.compliance_tasks.find({"document_id": document_id}).to_list(length=None)
        task_dict = {t["task_id"]: t for t in tasks}
        
        gaps = []
        
        for ev in evaluations:
            status = ev.get("status")
            if status in ["COMPLIANT", "UNKNOWN"]:
                continue
                
            task = task_dict.get(ev["task_id"])
            if not task:
                continue
                
            priority = task.get("priority", "MEDIUM")
            
            # Risk Scoring
            risk = "LOW"
            if status == "NON_COMPLIANT" and priority == "HIGH":
                risk = "HIGH"
            elif status == "NON_COMPLIANT" and priority == "MEDIUM":
                risk = "MEDIUM"
            elif status == "PARTIALLY_COMPLIANT" and priority == "HIGH":
                risk = "MEDIUM"
                
            gap = GapRecord(
                gap_id=f"GAP-{uuid.uuid4().hex[:8].upper()}",
                document_id=document_id,
                severity=risk,
                title=f"Gap in {task.get('title')}",
                description=ev.get("reason", "Incomplete compliance"),
                affected_task=task["task_id"],
                affected_obligation=task["obligation_id"],
                risk=risk,
                recommendation=ev.get("recommended_actions", ["Remediate immediately"])[0] if ev.get("recommended_actions") else "Remediate immediately",
                estimated_effort="Unknown",
                priority="P1" if risk == "HIGH" else "P2"
            )
            gaps.append(gap.model_dump())
            
        if gaps:
            await db.gaps.insert_many(gaps)
            
        Logger.info("GapAnalysisAgent", f"Finished for {document_id}. Identified {len(gaps)} gaps.")
        return context
