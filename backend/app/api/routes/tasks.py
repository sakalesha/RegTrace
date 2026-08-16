from fastapi import APIRouter, BackgroundTasks, HTTPException, Query
from typing import List, Optional
from datetime import datetime

from app.db.mongodb import db
from app.schemas.document import DocumentStatus
from app.schemas.task import (
    TaskResponse,
    TaskUpdate,
    TaskAssignRequest,
    TaskStatus,
    Department,
)
from app.services.task_service import TaskService

router = APIRouter()
service = TaskService()


@router.get("/", response_model=List[TaskResponse])
async def get_tasks(
    document_id: Optional[str] = Query(None, description="Filter by document ID"),
    status: Optional[TaskStatus] = Query(None, description="Filter by task status"),
    department: Optional[Department] = Query(None, description="Filter by assigned department"),
    priority: Optional[str] = Query(None, description="Filter by priority"),
):
    """
    Retrieve compliance tasks with optional filters.
    """
    filters = {}
    if document_id:
        filters["document_id"] = document_id
    if status:
        filters["status"] = status.value
    if department:
        filters["assigned_department"] = department.value
    if priority:
        filters["priority"] = priority

    tasks = await service.get_tasks(filters)
    return tasks


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(task_id: str):
    """
    Get a single task by its ID.
    """
    task = await service.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.put("/{task_id}", response_model=TaskResponse)
async def update_task(task_id: str, update_data: TaskUpdate):
    """
    Update a task: change status, reassign department, or edit task fields.
    """
    task = await service.update_task(task_id, update_data)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.post("/{task_id}/assign", response_model=TaskResponse)
async def assign_task(task_id: str, request: TaskAssignRequest):
    """
    Assign or reassign a task to a department.
    """
    task = await service.assign_task(task_id, request.department)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.post("/document/{document_id}/generate")
async def generate_tasks(document_id: str, background_tasks: BackgroundTasks):
    """
    Triggers the background task generation for all approved obligations of a document.
    """
    database = db.get_db()
    doc = await database.documents.find_one({"document_id": document_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if doc.get("processing_status") == DocumentStatus.PROCESSING_CANCELLED.value:
        raise HTTPException(
            status_code=409,
            detail="Cannot generate tasks: the pipeline run for this document was cancelled. Re-run extraction first.",
        )

    # Stamp the job start so stale-job detection has a grace window before the
    # background task itself registers.
    await database.documents.update_one(
        {"document_id": document_id},
        {"$set": {"job_started_at": datetime.utcnow().isoformat()}}
    )
    background_tasks.add_task(service.process_document_tasks, document_id)
    return {
        "message": "Task generation started in the background",
        "document_id": document_id,
    }