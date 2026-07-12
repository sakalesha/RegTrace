from shared.database.mongodb import get_db
from shared.schemas.pipeline import ExecutionContext
from agents.base import BaseAgent
from shared.services.logger import Logger

CATEGORY_OWNER_MAP = {
    "Cybersecurity": {"department": "IT Security", "owner": "Security Team"},
    "Audit": {"department": "Compliance", "owner": "Compliance Officer"},
    "Risk": {"department": "Risk Management", "owner": "Risk Team"},
    "Trading": {"department": "Operations", "owner": "Trading Operations"},
    "Reporting": {"department": "Compliance", "owner": "Regulatory Reporting Team"}
}

class TaskAssignmentAgent(BaseAgent):

    @classmethod
    async def execute(cls, context: ExecutionContext) -> ExecutionContext:
        document_id = context.document_id
        Logger.info("TaskAssignmentAgent", f"Started for {document_id}")
        db = get_db()
        
        # 1. Fetch Pending Tasks
        tasks = await db.compliance_tasks.find({"document_id": document_id, "status": "PENDING_ASSIGNMENT"}).to_list(length=None)
        
        if not tasks:
            Logger.warning("TaskAssignmentAgent", f"No tasks found for assignment for {document_id}")
            return context
            
        Logger.info("TaskAssignmentAgent", f"Assigning {len(tasks)} tasks...")
        
        for task in tasks:
            text_to_analyze = f"{task.get('title', '')} {task.get('description', '')}".lower()
            
            assigned_dept = "General"
            assigned_owner = "Unassigned"
            
            for key, val in CATEGORY_OWNER_MAP.items():
                if key.lower() in text_to_analyze:
                    assigned_dept = val["department"]
                    assigned_owner = val["owner"]
                    break
                    
            if assigned_dept == "General":
                if "report" in text_to_analyze or "submit" in text_to_analyze:
                    assigned_dept = "Compliance"
                    assigned_owner = "Regulatory Reporting Team"
                elif "log" in text_to_analyze or "system" in text_to_analyze or "network" in text_to_analyze:
                    assigned_dept = "IT Security"
                    assigned_owner = "Security Team"
            
            await db.compliance_tasks.update_one(
                {"_id": task["_id"]},
                {"$set": {
                    "department": assigned_dept,
                    "owner": assigned_owner,
                    "status": "ASSIGNED"
                }}
            )
            
        Logger.info("TaskAssignmentAgent", f"Finished for {document_id}. Assigned {len(tasks)} tasks.")
        return context
