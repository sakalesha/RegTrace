from fastapi import APIRouter, HTTPException
from shared.database.mongodb import get_db

router = APIRouter()

@router.get("/obligations")
async def get_obligations(document_id: str = None, status: str = None):
    db = get_db()
    query = {}
    if document_id:
        query["document_id"] = document_id
    if status:
        query["status"] = status
    
    obligations = await db.obligations.find(query).to_list(length=500)
    for ob in obligations:
        ob["_id"] = str(ob["_id"])
    return obligations

@router.post("/obligations/{obligation_id}/approve")
async def approve_obligation(obligation_id: str):
    db = get_db()
    result = await db.obligations.update_one(
        {"obligation_id": obligation_id},
        {"$set": {"status": "VALIDATED"}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Obligation not found")
    return {"status": "approved", "obligation_id": obligation_id}

@router.post("/obligations/{obligation_id}/reject")
async def reject_obligation(obligation_id: str):
    db = get_db()
    result = await db.obligations.update_one(
        {"obligation_id": obligation_id},
        {"$set": {"status": "REJECTED"}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Obligation not found")
    return {"status": "rejected", "obligation_id": obligation_id}
