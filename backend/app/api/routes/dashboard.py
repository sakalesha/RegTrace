from fastapi import APIRouter
from app.db.mongodb import db
from pydantic import BaseModel

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
    
    total_obs = await database.obligations.count_documents({})
    pending_obs = await database.obligations.count_documents({"status": "PENDING"})
    approved_obs = await database.obligations.count_documents({"status": "APPROVED"})
    rejected_obs = await database.obligations.count_documents({"status": "REJECTED"})
    
    compliant = approved_obs
    
    kpis = {
        "total_obligations": total_obs,
        "compliant": compliant,
        "pending_tasks": pending_obs,
        "critical_gaps": rejected_obs
    }
    
    pending_reviews = {
        "obligations": pending_obs,
        "tasks": 5,
        "evidence": 3,
        "auditReports": 2
    }
    
    return DashboardStats(kpis=kpis, pending_reviews=pending_reviews)
