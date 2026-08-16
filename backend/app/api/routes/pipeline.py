from fastapi import APIRouter, HTTPException
from datetime import datetime
from typing import List, Optional

from app.db.mongodb import db
from app.services.job_registry import registry
from app.schemas.document import DocumentStatus
from pydantic import BaseModel

router = APIRouter()

class CancelResponse(BaseModel):
    message: str
    document_id: str
    cancelled: bool

class PipelineCounts(BaseModel):
    total: int = 0
    pending: int = 0
    approved: int = 0
    rejected: int = 0
    assigned: int = 0
    in_progress: int = 0
    completed: int = 0
    overdue: int = 0

class PipelineDocument(BaseModel):
    document_id: str
    title: Optional[str]
    processing_status: str
    upload_timestamp: Optional[datetime]
    document_type: Optional[str] = None
    author: Optional[str] = None
    page_count: Optional[int] = None
    file_size: Optional[int] = None
    language: Optional[str] = None
    source: Optional[str] = None
    publication_date: Optional[str] = None
    clause_count: int = 0
    obligation_clause_count: int = 0
    clauses_processed: int = 0
    tasks_processed: int = 0
    obligations: PipelineCounts
    tasks: PipelineCounts

class PipelineOverview(BaseModel):
    documents: List[PipelineDocument]

@router.post("/{document_id}/cancel", response_model=CancelResponse)
async def cancel_pipeline_run(document_id: str):
    """
    Requests cooperative cancellation of an in-flight pipeline job
    (obligation extraction or task generation) for a document.
    """
    database = db.get_db()

    doc = await database.documents.find_one({"document_id": document_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    status = doc.get("processing_status", "")
    cancelled = registry.cancel(document_id)

    cancellable = status in {
        DocumentStatus.EXTRACTING_OBLIGATIONS.value,
        DocumentStatus.GENERATING_TASKS.value,
    }

    if not cancelled and not cancellable:
        raise HTTPException(status_code=404, detail="No active pipeline run found for this document")

    await database.documents.update_one(
        {"document_id": document_id},
        {"$set": {
            "processing_status": DocumentStatus.PROCESSING_CANCELLED,
            "cancel_requested": True,
        }}
    )
    return CancelResponse(
        message="Pipeline run cancellation requested",
        document_id=document_id,
        cancelled=True,
    )

@router.get("/overview", response_model=PipelineOverview)
async def get_pipeline_overview():
    database = db.get_db()

    docs = await database.documents.find().sort("upload_timestamp", -1).to_list(length=None)

    obligation_agg = {
        "total": {"$sum": 1},
        "pending": {"$sum": {"$cond": [{"$eq": ["$status", "PENDING"]}, 1, 0]}},
        "approved": {"$sum": {"$cond": [{"$eq": ["$status", "APPROVED"]}, 1, 0]}},
        "rejected": {"$sum": {"$cond": [{"$eq": ["$status", "REJECTED"]}, 1, 0]}},
    }
    task_agg = {
        "total": {"$sum": 1},
        "pending": {"$sum": {"$cond": [{"$eq": ["$status", "PENDING_ASSIGNMENT"]}, 1, 0]}},
        "assigned": {"$sum": {"$cond": [{"$eq": ["$status", "ASSIGNED"]}, 1, 0]}},
        "in_progress": {"$sum": {"$cond": [{"$eq": ["$status", "IN_PROGRESS"]}, 1, 0]}},
        "completed": {"$sum": {"$cond": [{"$eq": ["$status", "COMPLETED"]}, 1, 0]}},
        "overdue": {"$sum": {"$cond": [{"$eq": ["$status", "OVERDUE"]}, 1, 0]}},
    }
    clause_agg = {"count": {"$sum": 1}}

    obligations_by_doc = {
        d["_id"]: d
        for d in await database.obligations.aggregate(
            [{"$group": {"_id": "$document_id", **obligation_agg}}]
        ).to_list(length=None)
    }
    tasks_by_doc = {
        d["_id"]: d
        for d in await database.tasks.aggregate(
            [{"$group": {"_id": "$document_id", **task_agg}}]
        ).to_list(length=None)
    }
    clauses_by_doc = {
        d["_id"]: d["count"]
        for d in await database.clauses.aggregate(
            [{"$group": {"_id": "$document_id", **clause_agg}}]
        ).to_list(length=None)
    }
    obligation_clauses_by_doc = {
        d["_id"]: d["count"]
        for d in await database.clauses.aggregate(
            [
                {"$match": {"has_obligations": True}},
                {"$group": {"_id": "$document_id", **clause_agg}},
            ]
        ).to_list(length=None)
    }

    result = []
    for doc in docs:
        o = obligations_by_doc.get(doc["document_id"], {})
        t = tasks_by_doc.get(doc["document_id"], {})
        meta = doc.get("metadata") or {}
        status = doc.get("processing_status", "UPLOADED")

        # A document stuck in a processing status with no live background job and
        # no recent heartbeat is a stale job (e.g. the server reloaded mid-run).
        # Report it as failed so the frontend stops polling and surfaces the issue.
        if status in {
            DocumentStatus.PARSED.value,
            DocumentStatus.EXTRACTING_OBLIGATIONS.value,
            DocumentStatus.GENERATING_TASKS.value,
        } and not registry.is_active(doc["document_id"]):
            job_started = doc.get("job_started_at")
            stale = True
            if job_started:
                try:
                    started = datetime.fromisoformat(job_started)
                    stale = (datetime.utcnow() - started).total_seconds() > 30
                except (ValueError, TypeError):
                    stale = True
            if stale:
                if status == DocumentStatus.EXTRACTING_OBLIGATIONS.value:
                    status = DocumentStatus.EXTRACTION_FAILED.value
                elif status == DocumentStatus.GENERATING_TASKS.value:
                    status = DocumentStatus.TASKS_GENERATION_FAILED.value
                else:  # PARSED: crashed segmentation
                    status = DocumentStatus.FAILED.value
                await database.documents.update_one(
                    {"document_id": doc["document_id"]},
                    {"$set": {"processing_status": status}},
                )

        result.append(
            PipelineDocument(
                document_id=doc["document_id"],
                title=doc.get("title"),
                processing_status=status,
                upload_timestamp=doc.get("upload_timestamp"),
                document_type=doc.get("document_type") or meta.get("document_type"),
                author=meta.get("author") or doc.get("author"),
                page_count=meta.get("page_count") or doc.get("page_count"),
                file_size=doc.get("file_size"),
                language=meta.get("language") or doc.get("language"),
                source=doc.get("source") or meta.get("source"),
                publication_date=meta.get("publication_date") or doc.get("publication_date"),
                clause_count=clauses_by_doc.get(doc["document_id"], 0),
                obligation_clause_count=obligation_clauses_by_doc.get(doc["document_id"], 0),
                clauses_processed=doc.get("clauses_processed", 0),
                tasks_processed=doc.get("tasks_processed", 0),
                obligations=PipelineCounts(
                    total=o.get("total", 0),
                    pending=o.get("pending", 0),
                    approved=o.get("approved", 0),
                    rejected=o.get("rejected", 0),
                ),
                tasks=PipelineCounts(
                    total=t.get("total", 0),
                    pending=t.get("pending", 0),
                    assigned=t.get("assigned", 0),
                    in_progress=t.get("in_progress", 0),
                    completed=t.get("completed", 0),
                    overdue=t.get("overdue", 0),
                ),
            )
        )

    return PipelineOverview(documents=result)
