from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Query, BackgroundTasks
from fastapi.responses import FileResponse
from starlette.background import BackgroundTask
from typing import List, Optional
import asyncio
import logging
import os
import tempfile

from app.db.mongodb import db
from app.schemas.evidence import EvidenceResponse, EvidenceUpdate, EvidenceStatus
from app.services.evidence_service import EvidenceService

router = APIRouter()
service = EvidenceService()


@router.post("/", response_model=EvidenceResponse)
async def submit_evidence(
    task_id: str = Form(...),
    document_id: str = Form(...),
    obligation_id: str = Form(...),
    description: Optional[str] = Form(None),
    submitted_by: Optional[str] = Form(None),
    file: UploadFile = File(...),
):
    """
    Upload and store compliance evidence linked to a task.
    """
    try:
        content = await file.read()
    except Exception:
        raise HTTPException(status_code=400, detail="Failed to read uploaded file")

    try:
        record = await service.submit_evidence(
            task_id=task_id,
            document_id=document_id,
            obligation_id=obligation_id,
            file_name=file.filename or "unnamed",
            content=content,
            description=description,
            submitted_by=submitted_by,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return _to_response(record)


@router.get("/task/{task_id}", response_model=List[EvidenceResponse])
async def get_evidence_by_task(task_id: str):
    """
    Retrieve all evidence submitted for a task.
    """
    records = await service.get_evidence_by_task(task_id)
    return [_to_response(r) for r in records]


@router.get("/document/{document_id}", response_model=List[EvidenceResponse])
async def get_evidence_by_document(document_id: str):
    """
    Retrieve all evidence submitted for a document.
    """
    records = await service.get_evidence_by_document(document_id)
    return [_to_response(r) for r in records]


@router.get("/{evidence_id}", response_model=EvidenceResponse)
async def get_evidence(evidence_id: str):
    """
    Get a single evidence record by its ID.
    """
    record = await service.get_evidence(evidence_id)
    if not record:
        raise HTTPException(status_code=404, detail="Evidence not found")
    return _to_response(record)


@router.get("/{evidence_id}/file")
async def get_evidence_file(evidence_id: str, background_tasks: BackgroundTasks):
    """
    Stream the stored evidence file.

    Evidence is stored on local disk and served directly. Records created
    before local storage was enabled may still reference a remote (Cloudinary)
    URL; those are downloaded through the backend as a fallback when reachable.
    """
    record = await service.get_evidence(evidence_id)
    if not record:
        raise HTTPException(status_code=404, detail="Evidence not found")

    url = record.file_url
    if not url:
        raise HTTPException(status_code=404, detail="Evidence file reference missing")

    media_type = "application/octet-stream"
    if record.file_type:
        media_type = {
            "pdf": "application/pdf",
            "png": "image/png",
            "jpg": "image/jpeg",
            "jpeg": "image/jpeg",
            "txt": "text/plain",
            "csv": "text/csv",
            "log": "text/plain",
        }.get(record.file_type, "application/octet-stream")

    if not url.startswith("http"):
        # Local fallback: serve from disk.
        if not os.path.exists(url):
            raise HTTPException(status_code=404, detail="Evidence file not found on disk")
        return FileResponse(url, media_type=media_type, filename=record.file_name)

    # Remote (Cloudinary) fallback: download through the backend and stream back.
    # This only applies to records created before local storage was enabled.
    from app.utils.storage import StorageUtility
    suffix = os.path.splitext(record.file_name or "")[1]
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    tmp_path = tmp.name
    tmp.close()
    try:
        await asyncio.to_thread(StorageUtility.download_file, url, record.document_id, tmp_path)
    except Exception as e:
        logger = logging.getLogger("pipeline.evidence")
        logger.error("Failed to retrieve remote evidence file %s from storage: %s", evidence_id, e)
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
        raise HTTPException(
            status_code=410,
            detail=(
                "This evidence was stored on remote storage that is unreachable from this "
                "environment. Please re-submit the evidence file so it is stored locally and can be viewed."
            ),
        )

    def _cleanup(path: str):
        if os.path.exists(path):
            os.remove(path)

    background_tasks.add_task(_cleanup, tmp_path)
    return FileResponse(tmp_path, media_type=media_type, filename=record.file_name)


@router.put("/{evidence_id}", response_model=EvidenceResponse)
async def update_evidence(evidence_id: str, update_data: EvidenceUpdate):
    """
    Update an evidence record: accept, reject, or edit its explanation.
    """
    record = await service.update_evidence(evidence_id, update_data)
    if not record:
        raise HTTPException(status_code=404, detail="Evidence not found")
    return _to_response(record)


def _to_response(record) -> EvidenceResponse:
    return EvidenceResponse(
        id=record.id,
        task_id=record.task_id,
        document_id=record.document_id,
        obligation_id=record.obligation_id,
        file_name=record.file_name,
        file_type=record.file_type,
        file_url=record.file_url,
        file_size=record.file_size,
        description=record.description,
        submitted_by=record.submitted_by,
        status=record.status,
        clause_reference=record.clause_reference,
        page_number=record.page_number,
        submitted_at=record.submitted_at,
        updated_at=record.updated_at,
    )
