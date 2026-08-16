from fastapi import APIRouter, BackgroundTasks, HTTPException, Query
from typing import List, Optional
from datetime import datetime
from app.db.mongodb import db
from app.schemas.obligation import ObligationResponse, ObligationUpdate, BulkApproveRequest
from app.services.obligation_service import ObligationService
from pydantic import BaseModel

router = APIRouter()
service = ObligationService()

@router.get("/", response_model=List[ObligationResponse])
async def get_obligations(
    document_id: Optional[str] = Query(None, description="Filter by document ID"),
    status: Optional[str] = Query(None, description="Filter by status (e.g., PENDING)")
):
    """
    Retrieve obligations with optional filters.
    """
    filters = {}
    if document_id:
        filters["document_id"] = document_id
    if status:
        filters["status"] = status
        
    obligations = await service.get_obligations(filters)
    return obligations

@router.post("/document/{document_id}/extract")
async def extract_obligations(document_id: str, background_tasks: BackgroundTasks):
    """
    Triggers the background extraction process for all clauses in a document.
    """
    # Stamp the job start so stale-job detection has a grace window before the
    # background task itself registers.
    database = db.get_db()
    await database.documents.update_one(
        {"document_id": document_id},
        {"$set": {"job_started_at": datetime.utcnow().isoformat()}}
    )
    # Trigger background task
    background_tasks.add_task(service.process_document_obligations, document_id)
    return {"message": "Obligation extraction started in the background", "document_id": document_id}

@router.put("/{obligation_id}/review", response_model=ObligationResponse)
async def review_obligation(obligation_id: str, update_data: ObligationUpdate):
    """
    Approve, reject, or edit an extracted obligation.
    """
    updated_obs = await service.review_obligation(
        obligation_id, 
        status=update_data.status or "EDITED",
        updated_data=update_data.model_dump(exclude_unset=True)
    )
    if not updated_obs:
        raise HTTPException(status_code=404, detail="Obligation not found")
    return updated_obs

class BulkApproveResponse(BaseModel):
    modified_count: int

@router.put("/bulk-approve", response_model=BulkApproveResponse)
async def bulk_approve_obligations(request: BulkApproveRequest):
    """
    Approve multiple obligations at once.
    """
    count = await service.bulk_approve(request.obligation_ids)
    return {"modified_count": count}
