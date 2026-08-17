from fastapi import APIRouter
from app.db.mongodb import db
from pydantic import BaseModel
from app.services.compliance_service import ComplianceService

router = APIRouter()

class DashboardStats(BaseModel):
    kpis: dict
    pending_reviews: dict

class ClearDbResponse(BaseModel):
    message: str
    collections_cleared: dict

@router.post("/clear-db", response_model=ClearDbResponse)
async def clear_db():
    """
    TEMPORARY dev utility: wipes all RegTrace collections.
    """
    database = db.get_db()
    cleared = {}
    for name in await database.list_collection_names():
        result = await database[name].delete_many({})
        cleared[name] = result.deleted_count
    return ClearDbResponse(
        message="Database cleared successfully",
        collections_cleared=cleared,
    )

@router.get("/stats", response_model=DashboardStats)
async def get_dashboard_stats():
    database = db.get_db()

    overview = await ComplianceService().get_overview()
    sc = overview.status_counts

    # KPIs now reflect real, full-chain compliance (approved + tasks done + evidence accepted).
    kpis = {
        "total_obligations": overview.total_obligations,
        "compliant": sc.get("COMPLIANT", 0),
        "pending_tasks": sc.get("NOT_STARTED", 0) + sc.get("PARTIALLY_COMPLIANT", 0),
        "critical_gaps": sc.get("NON_COMPLIANT", 0),
    }

    pending_obs = await database.obligations.count_documents({"status": "PENDING"})
    pending_reviews = {
        "obligations": pending_obs,
        "tasks": sc.get("PARTIALLY_COMPLIANT", 0),
        "evidence": 0,
        "auditReports": 0,
    }

    return DashboardStats(kpis=kpis, pending_reviews=pending_reviews)
