import uuid
from datetime import datetime
from shared.database.mongodb import get_db
from shared.schemas.task import ComplianceTask
from shared.services.logger import Logger

class TaskGenerationAgent:
    """
    Deterministically converts an approved obligation into an operational compliance task.
    Does NOT use an LLM, as the obligation has already been validated by a human.
    """

    @classmethod
    async def generate_task(cls, obligation_id: str) -> dict:
        Logger.info("TaskGenerationAgent", f"Generating task for approved obligation {obligation_id}")
        db = get_db()
        
        # 1. Fetch obligation
        obligation = await db.obligations.find_one({"obligation_id": obligation_id})
        
        if not obligation:
            Logger.error("TaskGenerationAgent", f"Obligation {obligation_id} not found.")
            return {"error": "Obligation not found"}
            
        if obligation.get("status") not in ["APPROVED", "VALIDATED", "EDITED"]:
            Logger.warning("TaskGenerationAgent", f"Obligation {obligation_id} does not have an approved status (current: {obligation.get('status')})")
            return {"error": "Obligation is not approved"}

        # 2. Extract deterministic fields
        ob_text = obligation.get("obligation_text", obligation.get("description", ""))
        clause_number = obligation.get("clause_number", "Unknown Clause")
        evidence = obligation.get("evidence_type", "None specified")
        
        # Determine Title (truncate up to 80 chars cleanly)
        title = ob_text
        if len(title) > 80:
            last_space = title.rfind(' ', 0, 80)
            if last_space > 0:
                title = title[:last_space] + "..."
            else:
                title = title[:77] + "..."
                
        # Determine Description
        description = f"Obligation:\n{ob_text}\n\nClause Reference:\n{clause_number}\n\nEvidence Required:\n{evidence}"
        
        # Priority mapping
        priority = "MEDIUM"
        if obligation.get("penalty_referenced"):
            priority = "HIGH"

        # 3. Create Task Object
        task = ComplianceTask(
            task_id=f"TSK-{uuid.uuid4().hex[:8].upper()}",
            document_id=obligation.get("circular_id", obligation.get("document_id")),
            obligation_id=obligation_id,
            title=title,
            description=description,
            owner_role="Compliance Officer",
            priority=priority,
            status="OPEN",
            frequency=obligation.get("frequency"),
            deadline=obligation.get("deadline"),
            evidence_required=obligation.get("evidence_type"),
            trace={
                "document_id": obligation.get("circular_id", obligation.get("document_id")),
                "clause_id": obligation.get("clause_id"),
                "obligation_id": obligation_id,
                "review_id": None # MVP: Can be extended when tracking specific reviewer sessions
            },
            created_at=datetime.utcnow()
        )
        
        task_dict = task.model_dump()
        
        # 4. Save Task to DB
        await db.compliance_tasks.insert_one(task_dict)
        
        # 5. Link Task back to Obligation
        await db.obligations.update_one(
            {"obligation_id": obligation_id},
            {"$set": {"task_id": task.task_id}}
        )
        
        from shared.services.audit import AuditLogService
        await AuditLogService.append("TASK_CREATED", {
            "task_id": task.task_id, 
            "obligation_id": obligation_id
        })
        
        Logger.info("TaskGenerationAgent", f"Successfully generated task {task.task_id} for obligation {obligation_id}")
        
        return {
            "task_id": task.task_id,
            "obligation_id": obligation_id
        }
