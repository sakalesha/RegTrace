from fastapi import APIRouter, File, UploadFile, Form, HTTPException
from typing import Optional
import uuid

from shared.database.mongodb import get_db
from agents.ingestion import IngestionAgent
from shared.schemas.document import DocumentMetadataInput, DocumentRecord
from shared.schemas.pipeline import ExecutionContext

router = APIRouter()

@router.post("/ingest", response_model=DocumentRecord, status_code=201)
async def ingest_document(
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
    
    execution_id = f"WF-{uuid.uuid4().hex[:8].upper()}"
    context = ExecutionContext(
        execution_id=execution_id,
        metadata={
            "upload_file": file,
            "metadata_input": metadata_input
        }
    )
    
    try:
        context = await IngestionAgent.execute(context)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        from shared.services.logger import Logger
        Logger.error("IngestionAPI", "Internal Server Error during ingestion", exc=e)
        raise HTTPException(status_code=500, detail="Internal Server Error: An unexpected error occurred during ingestion.")
        
    db = get_db()
    record_dict = await db.raw_documents.find_one({"document_id": context.document_id})
    if not record_dict:
        raise HTTPException(status_code=500, detail="Document record not found after ingestion")
        
    return DocumentRecord(**record_dict)

@router.get("/documents/{document_id}", response_model=DocumentRecord)
async def get_document(document_id: str):
    db = get_db()
    record_dict = await db.raw_documents.find_one({"document_id": document_id})
    if not record_dict:
        raise HTTPException(status_code=404, detail="Document not found")
    return DocumentRecord(**record_dict)

from shared.schemas.document import ClauseRecord
from typing import List

@router.get("/documents/{document_id}/clauses", response_model=List[ClauseRecord])
async def get_document_clauses(document_id: str):
    db = get_db()
    clauses = await db.clauses.find({"document_id": document_id}).sort("sequence_number", 1).to_list(length=None)
    return [ClauseRecord(**c) for c in clauses]
