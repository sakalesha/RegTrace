from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from backend.app.auth.dependencies import require_role
from backend.app.auth.models import UserOut, UserRole
from backend.app.monitoring.repository import GapRepository
from backend.app.monitoring.models import GapListResponse, GapSummaryResponse, GapResolveRequest
from shared.services.audit import AuditLogService

router = APIRouter()

@router.get("/compliance-gaps", response_model=GapListResponse)
async def list_gaps(
    gap_type: Optional[str] = Query(None, description="Filter by gap type"),
    resolved: Optional[bool] = Query(False, description="Filter by resolved status"),
    skip: int = 0,
    limit: int = 50,
    current_user: UserOut = Depends(require_role([UserRole.ADMIN, UserRole.COMPLIANCE_OFFICER, UserRole.VIEWER]))
):
    gaps = await GapRepository.get_gaps(gap_type, resolved, skip, limit)
    return {"gaps": gaps, "total": len(gaps)}

@router.get("/compliance-gaps/summary", response_model=GapSummaryResponse)
async def gap_summary(
    current_user: UserOut = Depends(require_role([UserRole.ADMIN, UserRole.COMPLIANCE_OFFICER, UserRole.VIEWER, UserRole.TASK_OWNER]))
):
    summary = await GapRepository.get_gap_summary()
    return summary

@router.patch("/compliance-gaps/{gap_id}/resolve")
async def resolve_gap(
    gap_id: str,
    request: GapResolveRequest,
    current_user: UserOut = Depends(require_role([UserRole.ADMIN, UserRole.COMPLIANCE_OFFICER]))
):
    gap = await GapRepository.resolve_gap(gap_id, current_user.id, request.resolution_note)
    if not gap:
        raise HTTPException(status_code=404, detail="Gap not found or already resolved")
        
    await AuditLogService.append("COMPLIANCE_GAP_RESOLVED", {
        "gap_id": gap_id,
        "gap_type": gap["gap_type"],
        "resolved_by": current_user.id,
        "resolution_note": request.resolution_note
    })
    
    return {"status": "resolved", "gap_id": gap_id}
