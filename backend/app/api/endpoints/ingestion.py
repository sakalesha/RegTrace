from fastapi import APIRouter, File, UploadFile, Form, BackgroundTasks
from typing import Optional

from agents.ingestion import IngestionAgent
from shared.schemas.document import DocumentMetadataInput, DocumentRecord

router = APIRouter()

@router.post("/ingest", response_model=DocumentRecord, status_code=201)
async def ingest_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    source: Optional[str] = Form(None),
    document_type: Optional[str] = Form(None),
    publication_date: Optional[str] = Form(None),
    language: str = Form("English")
):
    metadata_input = DocumentMetadataInput(
        title=title,
        source=source,
        document_type=document_type,
        publication_date=publication_date,
        language=language
    )
    
    record = await IngestionAgent.process_document(file, metadata_input, background_tasks)
    return record
