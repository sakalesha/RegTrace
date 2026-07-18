from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from shared.database.mongodb import get_db

from backend.app.auth.dependencies import get_current_user, require_role
from backend.app.auth.models import UserOut, UserRole

router = APIRouter()

@router.get("/obligations/review-queue")
async def get_review_queue(
    current_user: UserOut = Depends(require_role([UserRole.ADMIN, UserRole.COMPLIANCE_OFFICER])),
    document_id: Optional[str] = None,
    status: Optional[str] = None
):
    db = get_db()
    query = {}
    if document_id:
        query["$or"] = [{"document_id": document_id}, {"circular_id": document_id}]
    if status:
        query["status"] = status
    
    obligations = await db.obligations.find(query).to_list(length=500)
    for ob in obligations:
        ob["_id"] = str(ob["_id"])
    return obligations

@router.get("/obligations")
async def get_obligations(document_id: str = None, status: str = None):
    db = get_db()
    query = {}
    if document_id:
        query["$or"] = [{"document_id": document_id}, {"circular_id": document_id}]
    if status:
        query["status"] = status
    
    obligations = await db.obligations.find(query).to_list(length=500)
    for ob in obligations:
        ob["_id"] = str(ob["_id"])
    return obligations

from agents.task_generation import TaskGenerationAgent

from shared.services.audit import AuditLogService

@router.post("/obligations/{obligation_id}/approve")
async def approve_obligation(
    obligation_id: str,
    current_user: UserOut = Depends(require_role([UserRole.ADMIN, UserRole.COMPLIANCE_OFFICER]))
):
    db = get_db()
    result = await db.obligations.update_one(
        {"obligation_id": obligation_id},
        {"$set": {"status": "VALIDATED", "reviewed_by": current_user.id}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Obligation not found")
        
    # Append to Audit Log
    await AuditLogService.append("OBLIGATION_APPROVED", {"obligation_id": obligation_id}, actor=current_user.id)
        
    # Trigger deterministic task generation
    task_res = await TaskGenerationAgent.generate_task(obligation_id)
    if "error" in task_res:
        raise HTTPException(status_code=500, detail=task_res["error"])
        
    return {"status": "approved", "obligation_id": obligation_id, "task_id": task_res["task_id"]}


@router.post("/obligations/{obligation_id}/reject")
async def reject_obligation(
    obligation_id: str,
    current_user: UserOut = Depends(require_role([UserRole.ADMIN, UserRole.COMPLIANCE_OFFICER]))
):
    db = get_db()
    result = await db.obligations.update_one(
        {"obligation_id": obligation_id},
        {"$set": {"status": "REJECTED", "reviewed_by": current_user.id}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Obligation not found")
        
    # Append to Audit Log
    await AuditLogService.append("OBLIGATION_REJECTED", {"obligation_id": obligation_id}, actor=current_user.id)
    return {"status": "rejected", "obligation_id": obligation_id}
