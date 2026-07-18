from fastapi import APIRouter, Depends
from shared.database.mongodb import get_db
from backend.app.auth.dependencies import get_current_user
from backend.app.auth.models import UserOut

router = APIRouter()

@router.get("/dashboard")
async def get_dashboard(
    current_user: UserOut = Depends(get_current_user),
    document_id: str = None
):
    db = get_db()
    query = {}
    if document_id:
        query["document_id"] = document_id
    
    obligations = await db.obligations.find(query).to_list(length=1000)
    tasks = await db.compliance_tasks.find(query).to_list(length=1000)
    evaluations = await db.evaluations.find(query).to_list(length=1000)
    gaps = await db.compliance_gaps.find(query).to_list(length=1000)
    
    return {
        "obligations": {
            "total": len(obligations),
            "validated": len([o for o in obligations if o.get("status") in ["VALIDATED", "APPROVED", "EDITED"]]),
            "pending": len([o for o in obligations if o.get("status") in ["PENDING_VALIDATION", "PENDING"]]),
            "rejected": len([o for o in obligations if o.get("status") == "REJECTED"]),
            "avg_confidence": round(
                sum(o.get("confidence", 0) for o in obligations) / max(len(obligations), 1), 2
            )
        },
        "tasks": {
            "total": len(tasks),
            "open": len([t for t in tasks if t.get("status") == "OPEN"]),
            "completed": len([t for t in tasks if t.get("status") == "COMPLETED"]),
            "overdue": len([t for t in tasks if t.get("status") == "OVERDUE"])
        },
        "evaluations": {
            "total": len(evaluations),
            "compliant": len([e for e in evaluations if e.get("status") == "COMPLIANT"]),
            "non_compliant": len([e for e in evaluations if e.get("status") == "NON_COMPLIANT"]),
            "partial": len([e for e in evaluations if e.get("status") == "PARTIALLY_COMPLIANT"])
        },
        "gaps": {
            "total": len(gaps),
            "missing_task": len([g for g in gaps if g.get("gap_type") == "missing_task_for_approved_obligation"]),
            "stale_deadline": len([g for g in gaps if g.get("gap_type") == "unassigned_deadline_stale"]),
            "unresolved": len([g for g in gaps if not g.get("resolved")])
        }
    }

@router.get("/gaps")
async def get_mock_gaps(current_user: UserOut = Depends(get_current_user)):
    from datetime import datetime, timedelta
    now = datetime.utcnow()
    return [
        {
            "id": "gap-1",
            "gap_type": "Missing Evidence",
            "description": "No BCP/DR Test Log uploaded for Q3.",
            "detected_at": (now - timedelta(days=2)).isoformat(),
            "severity": "High",
            "resolved": False
        },
        {
            "id": "gap-2",
            "gap_type": "Stale Task",
            "description": "KYC review task overdue by 14 days.",
            "detected_at": (now - timedelta(days=5)).isoformat(),
            "severity": "Medium",
            "resolved": False
        }
    ]

@router.get("/report")
async def get_report(document_id: str):
    db = get_db()
    report = await db.reports.find_one({"document_id": document_id})
    if report:
        report["_id"] = str(report["_id"])
    return report
