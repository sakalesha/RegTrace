from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
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
async def get_obligations(
    current_user: UserOut = Depends(require_role([UserRole.ADMIN, UserRole.COMPLIANCE_OFFICER, UserRole.VIEWER])),
    document_id: str = None, 
    status: str = None
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

from agents.task_generation import TaskGenerationAgent

from shared.services.audit import AuditLogService

@router.post("/obligations/{obligation_id}/approve")
async def approve_obligation(
    obligation_id: str,
    background_tasks: BackgroundTasks,
    current_user: UserOut = Depends(require_role([UserRole.ADMIN, UserRole.COMPLIANCE_OFFICER]))
):
    db = get_db()
    
    async with await db.client.start_session() as session:
        async def callback(sess):
            result = await db.obligations.update_one(
                {"obligation_id": obligation_id, "status": "PENDING_VALIDATION"},
                {"$set": {"status": "VALIDATED", "reviewed_by": current_user.id}},
                session=sess
            )
            if result.modified_count == 0:
                raise HTTPException(status_code=404, detail="Obligation not found or already reviewed")
                
            # Append to Audit Log
            await AuditLogService.append("OBLIGATION_APPROVED", {"obligation_id": obligation_id}, actor=current_user.id, session=sess)
            return True

        await session.with_transaction(callback)
        
    # Trigger deterministic task generation asynchronously (outside transaction to avoid duplicates on retry)
    background_tasks.add_task(TaskGenerationAgent.generate_task, obligation_id)
        
    return {"status": "approved", "obligation_id": obligation_id, "message": "Task generation queued"}


@router.post("/obligations/{obligation_id}/reject")
async def reject_obligation(
    obligation_id: str,
    current_user: UserOut = Depends(require_role([UserRole.ADMIN, UserRole.COMPLIANCE_OFFICER]))
):
    db = get_db()
    
    async with await db.client.start_session() as session:
        async def callback(sess):
            result = await db.obligations.update_one(
                {"obligation_id": obligation_id, "status": "PENDING_VALIDATION"},
                {"$set": {"status": "REJECTED", "reviewed_by": current_user.id}},
                session=sess
            )
            if result.modified_count == 0:
                raise HTTPException(status_code=404, detail="Obligation not found or already reviewed")
                
            # Append to Audit Log
            await AuditLogService.append("OBLIGATION_REJECTED", {"obligation_id": obligation_id}, actor=current_user.id, session=sess)
            return {"status": "rejected", "obligation_id": obligation_id}
            
        return await session.with_transaction(callback)
