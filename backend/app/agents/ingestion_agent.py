import os
import hashlib
import uuid
import fitz  # PyMuPDF
from datetime import datetime
from app.agents.base_agent import BaseAgent
from app.schemas.document import IngestionInput, DocumentOutput, DocumentStatus
from app.models.document import DocumentModel
from app.utils.storage import StorageUtility
from app.db.mongodb import db

class IngestionAgent(BaseAgent):
    """
    The Ingestion Agent validates uploaded PDFs, extracts metadata, 
    uploads the file to secure storage, and creates a document record.
    """
    
    async def validate(self, input_data: IngestionInput):
        if not os.path.exists(input_data.file_path):
            raise FileNotFoundError(f"File not found: {input_data.file_path}")
            
        file_size = os.path.getsize(input_data.file_path)
        if file_size == 0:
            raise ValueError("File is empty.")
            
        # Basic PDF validation
        try:
            doc = fitz.open(input_data.file_path)
            if doc.page_count == 0:
                raise ValueError("PDF has no pages.")
            doc.close()
        except Exception as e:
            raise ValueError(f"Invalid or corrupted PDF file: {str(e)}")

    async def process(self, input_data: IngestionInput) -> DocumentOutput:
        file_path = input_data.file_path
        
        # 1. Compute SHA-256
        sha256_hash = hashlib.sha256()
        with open(file_path, "rb") as f:
            for byte_block in iter(lambda: f.read(4096), b""):
                sha256_hash.update(byte_block)
        file_hash = sha256_hash.hexdigest()
        
        # 2. Check for duplicate hash in DB
        database = db.get_db()
        existing_doc = await database["documents"].find_one({"file_hash": file_hash})
        if existing_doc:
            # If duplicate, just return the existing document mapped to DocumentOutput
            return DocumentOutput(**existing_doc)
            
        # 3. Generate ID (DOC_YYYYMMDD_UUID)
        date_str = datetime.utcnow().strftime("%Y%m%d")
        short_uuid = str(uuid.uuid4())[:8].upper()
        document_id = f"DOC_{date_str}_{short_uuid}"
        
        # 4. Extract PDF Metadata
        pdf_metadata = {}
        try:
            doc = fitz.open(file_path)
            meta = doc.metadata
            pdf_metadata["title"] = meta.get("title", "")
            pdf_metadata["author"] = meta.get("author", "")
            pdf_metadata["creation_date"] = meta.get("creationDate", "")
            pdf_metadata["modification_date"] = meta.get("modDate", "")
            pdf_metadata["page_count"] = doc.page_count
            doc.close()
        except Exception:
            pass
            
        # Merge with user provided metadata
        merged_metadata = input_data.metadata.dict() if input_data.metadata else {}
        for k, v in pdf_metadata.items():
            if not merged_metadata.get(k) and v:
                merged_metadata[k] = v
                
        # 5. Upload File
        file_size = os.path.getsize(file_path)
        storage_path = StorageUtility.upload_file(file_path, public_id=document_id)
        
        # 6. Create Output
        output = DocumentOutput(
            document_id=document_id,
            title=merged_metadata.get("title") or input_data.file_name,
            document_type=merged_metadata.get("document_type"),
            intermediary_category=merged_metadata.get("intermediary_category", "STOCKBROKER"),
            source=merged_metadata.get("source"),
            publication_date=merged_metadata.get("publication_date"),
            file_storage_path=storage_path,
            file_size=file_size,
            file_hash=file_hash,
            upload_timestamp=input_data.upload_timestamp,
            processing_status=DocumentStatus.UPLOADED,
            metadata=merged_metadata
        )
        
        return output

    async def validate_output(self, output_data: DocumentOutput):
        # Pydantic inherently validates it upon creation
        pass

    async def persist(self, output_data: DocumentOutput):
        database = db.get_db()
        # Check if already persisted (in case of duplicate returned early)
        existing = await database["documents"].find_one({"document_id": output_data.document_id})
        if not existing:
            # Convert to dict, handle Enums/Datetimes
            model = DocumentModel(**output_data.dict())
            await database["documents"].insert_one(model.dict(by_alias=True))
