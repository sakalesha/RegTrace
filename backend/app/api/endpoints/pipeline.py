from fastapi import APIRouter, File, UploadFile, Form, HTTPException, Depends, BackgroundTasks
from fastapi.responses import JSONResponse
from typing import Optional
import uuid
import os
import shutil

from shared.services.storage import StorageService
from shared.database.mongodb import get_db
from shared.schemas.document import DocumentMetadataInput
from shared.schemas.pipeline import ExecutionContext, PipelineConfig
from agents.orchestrator import OrchestratorAgent

from backend.app.auth.dependencies import get_current_user, require_role
from backend.app.auth.models import UserOut, UserRole

router = APIRouter()

@router.post("/pipeline/run")
async def run_pipeline(
    background_tasks: BackgroundTasks,
    current_user: UserOut = Depends(require_role([UserRole.ADMIN, UserRole.COMPLIANCE_OFFICER])),
    file: Optional[UploadFile] = File(None),
    text: Optional[str] = Form(None),
    title: Optional[str] = Form(None),
    source: Optional[str] = Form("SEBI"),
    document_type: Optional[str] = Form("Circular"),
    publication_date: Optional[str] = Form(None),
    language: str = Form("English")
):
    if not file and not text:
        raise HTTPException(status_code=400, detail="Provide either a file or text.")
    
    metadata_input = DocumentMetadataInput(
        title=title or (file.filename if file else "Uploaded Document"),
        source=source,
        document_type=document_type,
        publication_date=publication_date,
        language=language
    )
    
    execution_id = f"WF-{uuid.uuid4().hex[:8].upper()}"
    document_id = f"DOC-{uuid.uuid4().hex[:8].upper()}"
    
    file_path = None
    filename = None
    if file:
        upload_dir = os.path.join(os.getcwd(), "storage", "uploads")
        StorageService.ensure_dir(upload_dir)
        ext = os.path.splitext(file.filename)[1].lower()
        if not ext or ext not in [".pdf", ".docx", ".txt"]:
            ext = ".bin"
        file_path = os.path.join(upload_dir, f"{document_id}{ext}")
        filename = file.filename
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
    context = ExecutionContext(
        execution_id=execution_id,
        document_id=document_id,
        triggered_by=current_user.id,
        config=PipelineConfig(),
        metadata={
            "file_path": file_path,
            "filename": filename,
            "raw_text": text,
            "metadata_input": metadata_input
        }
    )
    
    # Save initial pending state so polling works immediately
    db = get_db()
    db_payload = context.model_dump(exclude={"metadata"})
    db_payload["pipeline_status"] = "PENDING"
    await db.pipeline_execution.insert_one(db_payload)
    
    # Dispatch to background task
    background_tasks.add_task(OrchestratorAgent.run, context)
    
    return {
        "execution_id": execution_id,
        "status": "ACCEPTED"
    }

@router.get("/pipeline/status/{execution_id}")
async def get_pipeline_status(
    execution_id: str,
    current_user: UserOut = Depends(require_role([UserRole.ADMIN, UserRole.COMPLIANCE_OFFICER, UserRole.VIEWER]))
):
    db = get_db()
    execution = await db.pipeline_execution.find_one({"execution_id": execution_id})
    if not execution:
        raise HTTPException(status_code=404, detail="Execution not found")
        
    return {
        "execution_id": execution.get("execution_id"),
        "document_id": execution.get("document_id"),
        "status": execution.get("pipeline_status"),
        "current_agent": execution.get("current_agent"),
        "overall_duration": execution.get("overall_duration"),
        "agents_executed": len(execution.get("results", [])),
        "agent_results": execution.get("results", [])
    }
