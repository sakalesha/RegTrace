import os
import uuid
import shutil
from fastapi import UploadFile

from shared.database.mongodb import get_db
from shared.schemas.document import DocumentRecord
from shared.schemas.pipeline import ExecutionContext
from agents.base import BaseAgent
from shared.services.logger import Logger
from shared.services.storage import StorageService

class IngestionAgent(BaseAgent):

    @classmethod
    async def execute(cls, context: ExecutionContext) -> ExecutionContext:
        Logger.info("IngestionAgent", "Starting ingestion process...")
        db = get_db()
        
        file: UploadFile = context.metadata.get("upload_file")
        metadata_input = context.metadata.get("metadata_input")
        
        if not file or not metadata_input:
            raise ValueError("UploadFile or metadata_input missing from ExecutionContext metadata")
            
        document_id = f"DOC-{uuid.uuid4().hex[:8].upper()}"
        Logger.info("IngestionAgent", f"Generated document_id: {document_id}")
        
        upload_dir = os.path.join(os.getcwd(), "storage", "uploads")
        StorageService.ensure_dir(upload_dir)
        
        file_path = os.path.join(upload_dir, f"{document_id}_{file.filename}")
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        Logger.info("IngestionAgent", f"File saved to {file_path}")
        
        doc_record = DocumentRecord(
            document_id=document_id,
            title=metadata_input.title or file.filename,
            source=metadata_input.source or "Upload",
            document_type=metadata_input.document_type or "PDF",
            publication_date=metadata_input.publication_date or "",
            language=metadata_input.language or "English",
            status="UPLOADED",
            file_path=file_path,
            checksum="DUMMY_CHECKSUM"
        )
        
        await db.raw_documents.insert_one(doc_record.model_dump())
        Logger.info("IngestionAgent", "Document metadata stored in MongoDB.")
        
        context.document_id = document_id
        return context
