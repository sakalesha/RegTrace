from fastapi import APIRouter, File, UploadFile, Form, HTTPException, Depends
from fastapi.responses import JSONResponse
from typing import Optional
import uuid

from shared.database.mongodb import get_db
from shared.schemas.document import DocumentMetadataInput
from shared.schemas.pipeline import ExecutionContext, PipelineConfig
from agents.orchestrator import OrchestratorAgent

from backend.app.auth.dependencies import get_current_user, require_role
from backend.app.auth.models import UserOut, UserRole

router = APIRouter()

@router.post("/pipeline/run")
async def run_pipeline(
    current_user: UserOut = Depends(require_role([UserRole.ADMIN, UserRole.COMPLIANCE_OFFICER])),
    file: Optional[UploadFile] = File(None),
    text: Optional[str] = Form(None),
    title: Optional[str] = Form(None),
    source: Optional[str] = Form("SEBI"),
    document_type: Optional[str] = Form("Circular"),
    publication_date: Optional[str] = Form(None),
    language: str = Form("English"),
    enable_mock_evidence: bool = Form(True),
    enable_knowledge_graph: bool = Form(True)
):
    if not file and not text:
        raise HTTPException(status_code=400, detail="Provide either a file or text.")
    
    metadata_input = DocumentMetadataInput(
        title=title or "Uploaded Document",
        source=source,
        document_type=document_type,
        publication_date=publication_date,
        language=language
    )
    
    execution_id = f"WF-{uuid.uuid4().hex[:8].upper()}"
    
    context = ExecutionContext(
        execution_id=execution_id,
        triggered_by=current_user.id,
        config=PipelineConfig(
            enable_mock_evidence=enable_mock_evidence,
            enable_knowledge_graph=enable_knowledge_graph
        ),
        metadata={
            "upload_file": file,
            "raw_text": text,
            "metadata_input": metadata_input
        }
    )
    
    context = await OrchestratorAgent.run(context)
    
    return {
        "execution_id": context.execution_id,
        "document_id": context.document_id,
        "status": context.pipeline_status,
        "overall_duration": context.overall_duration,
        "report_id": context.report_id,
        "agents_executed": len(context.results),
        "agent_results": [
            {
                "name": r.agent_name,
                "status": r.status,
                "duration": r.duration_seconds,
                "error": r.error
            }
            for r in context.results
        ]
    }
