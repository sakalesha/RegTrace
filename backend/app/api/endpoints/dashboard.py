from fastapi import APIRouter
from shared.database.mongodb import get_db

router = APIRouter()

@router.get("/dashboard")
async def get_dashboard(document_id: str = None):
    db = get_db()
    query = {}
    if document_id:
        query["document_id"] = document_id
    
    obligations = await db.obligations.find(query).to_list(length=1000)
    tasks = await db.compliance_tasks.find(query).to_list(length=1000)
    evaluations = await db.evaluations.find(query).to_list(length=1000)
    gaps = await db.gaps.find(query).to_list(length=1000)
    
    return {
        "obligations": {
            "total": len(obligations),
            "validated": len([o for o in obligations if o.get("status") == "VALIDATED"]),
            "pending": len([o for o in obligations if o.get("status") == "PENDING_VALIDATION"]),
            "rejected": len([o for o in obligations if o.get("status") == "REJECTED"]),
            "avg_confidence": round(
                sum(o.get("confidence", 0) for o in obligations) / max(len(obligations), 1), 2
            )
        },
        "tasks": {
            "total": len(tasks),
            "assigned": len([t for t in tasks if t.get("status") == "ASSIGNED"]),
            "completed": len([t for t in tasks if t.get("status") == "COMPLETED"]),
            "pending": len([t for t in tasks if t.get("status") == "PENDING_ASSIGNMENT"])
        },
        "evaluations": {
            "total": len(evaluations),
            "compliant": len([e for e in evaluations if e.get("status") == "COMPLIANT"]),
            "non_compliant": len([e for e in evaluations if e.get("status") == "NON_COMPLIANT"]),
            "partial": len([e for e in evaluations if e.get("status") == "PARTIALLY_COMPLIANT"])
        },
        "gaps": {
            "total": len(gaps),
            "high_risk": len([g for g in gaps if g.get("risk") == "HIGH"]),
            "medium_risk": len([g for g in gaps if g.get("risk") == "MEDIUM"]),
            "low_risk": len([g for g in gaps if g.get("risk") == "LOW"])
        }
    }

@router.get("/report")
async def get_report(document_id: str):
    db = get_db()
    report = await db.reports.find_one({"document_id": document_id})
    if report:
        report["_id"] = str(report["_id"])
    return report
