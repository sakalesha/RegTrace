from fastapi import APIRouter, Query, HTTPException
from typing import Optional

from app.services.audit_service import get_logs

router = APIRouter()


@router.get("/logs")
async def list_logs(
    document_id: Optional[str] = Query(None, description="Restrict to one document"),
    limit: int = Query(100, ge=1, le=500),
):
    """Return audit records newest-first (optionally for a single document)."""
    try:
        logs = await get_logs(document_id=document_id, limit=limit)
        return {"total": len(logs), "results": logs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load audit logs: {e}")
