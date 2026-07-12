from fastapi import APIRouter
from shared.database.mongodb import get_db

router = APIRouter()

@router.get("/tasks")
async def get_tasks(document_id: str = None, status: str = None):
    db = get_db()
    query = {}
    if document_id:
        query["document_id"] = document_id
    if status:
        query["status"] = status
    
    tasks = await db.compliance_tasks.find(query).to_list(length=500)
    for t in tasks:
        t["_id"] = str(t["_id"])
    return tasks

@router.post("/tasks/{task_id}/complete")
async def complete_task(task_id: str):
    db = get_db()
    await db.compliance_tasks.update_one(
        {"task_id": task_id},
        {"$set": {"status": "COMPLETED"}}
    )
    return {"status": "completed", "task_id": task_id}
