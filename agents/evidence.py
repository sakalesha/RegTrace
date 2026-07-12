import uuid
import asyncio
from shared.database.mongodb import get_db
from shared.schemas.pipeline import ExecutionContext
from shared.schemas.evidence import EvidenceRecord
from agents.base import BaseAgent
from shared.services.logger import Logger

class EvidenceCollectionAgent(BaseAgent):

    @classmethod
    async def execute(cls, context: ExecutionContext) -> ExecutionContext:
        document_id = context.document_id
        Logger.info("EvidenceCollectionAgent", f"Started for {document_id}")
        db = get_db()
        
        # 1. Fetch assigned tasks
        tasks = await db.compliance_tasks.find({"document_id": document_id, "status": "ASSIGNED"}).to_list(length=None)
        
        if not tasks:
            Logger.warning("EvidenceCollectionAgent", f"No assigned tasks found for evidence collection for {document_id}")
            return context
            
        Logger.info("EvidenceCollectionAgent", f"Collecting evidence for {len(tasks)} tasks...")
        all_evidence = []
        
        for task in tasks:
            # We will use the Mock Seeder approach directly here to generate perfect hits or missing hits for testing.
            if context.config.enable_mock_evidence:
                if task.get("priority") == "HIGH":
                    # Generate perfect mock evidence
                    ev = EvidenceRecord(
                        evidence_id=f"EVD-{uuid.uuid4().hex[:8].upper()}",
                        task_id=task["task_id"],
                        obligation_id=task["obligation_id"],
                        source_type="MOCK",
                        source_name="Mock_Audit_Log.csv",
                        matched_text=f"System verified: {task.get('title')}. Everything is working properly and finalized.",
                        relevance_score=0.95
                    )
                    all_evidence.append(ev.model_dump())
                elif task.get("priority") == "MEDIUM":
                    # Generate partial mock evidence
                    ev = EvidenceRecord(
                        evidence_id=f"EVD-{uuid.uuid4().hex[:8].upper()}",
                        task_id=task["task_id"],
                        obligation_id=task["obligation_id"],
                        source_type="MOCK",
                        source_name="Mock_Draft_Policy.pdf",
                        matched_text=f"Draft policy mentions: {task.get('title')}, but it is not formally approved.",
                        relevance_score=0.60
                    )
                    all_evidence.append(ev.model_dump())
                else:
                    # LOW priority gets NO evidence
                    pass

        if all_evidence:
            await db.evidence.insert_many(all_evidence)
            
        Logger.info("EvidenceCollectionAgent", f"Finished for {document_id}. Collected {len(all_evidence)} pieces of evidence.")
        return context
