import uuid
import json
from shared.database.mongodb import get_db
from shared.schemas.pipeline import ExecutionContext
from agents.base import BaseAgent
from shared.services.logger import Logger

class AuditReportAgent(BaseAgent):

    @classmethod
    async def execute(cls, context: ExecutionContext) -> ExecutionContext:
        document_id = context.document_id
        Logger.info("AuditReportAgent", f"Started for {document_id}")
        db = get_db()
        
        doc = await db.raw_documents.find_one({"document_id": document_id})
        obligations = await db.obligations.find({"document_id": document_id}).to_list(length=None)
        tasks = await db.compliance_tasks.find({"document_id": document_id}).to_list(length=None)
        evaluations = await db.evaluations.find({"document_id": document_id}).to_list(length=None)
        gaps = await db.gaps.find({"document_id": document_id}).to_list(length=None)
        
        # Strip _id for JSON serializability
        for lst in [obligations, tasks, evaluations, gaps]:
            for item in lst:
                if "_id" in item:
                    del item["_id"]
                    
        report = {
            "report_id": f"REP-{uuid.uuid4().hex[:8].upper()}",
            "document_id": document_id,
            "document_title": doc.get("title") if doc else "Unknown",
            "summary": {
                "total_obligations": len(obligations),
                "total_tasks": len(tasks),
                "compliant_tasks": len([e for e in evaluations if e.get("status") == "COMPLIANT"]),
                "non_compliant_tasks": len([e for e in evaluations if e.get("status") == "NON_COMPLIANT"]),
                "total_gaps": len(gaps),
                "high_risk_gaps": len([g for g in gaps if g.get("risk") == "HIGH"])
            },
            "gaps": gaps,
            "evaluations": evaluations
        }
        
        await db.reports.insert_one(report)
        del report["_id"]
        
        context.report_id = report["report_id"]
        
        Logger.info("AuditReportAgent", f"Finished for {document_id}. Report generated.")
        return context
