from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import ValidationError
from datetime import datetime
import os
import uuid
import hashlib
import json
import logging

import cloudinary
import cloudinary.uploader
import fitz # PyMuPDF
from fastapi import BackgroundTasks
from app.config import config
from app.db.mongodb import db
from app.schemas.document import DocumentOutput, DocumentStatus, DocumentMetadata

logger = logging.getLogger("pipeline.upload")
from app.schemas.clause import ClauseSegmentationInput
from app.agents.clause_segmentation_agent import ClauseSegmentationAgent
from app.utils.layout import extract_blocks

cloudinary.config(
    cloud_name=config.CLOUDINARY_CLOUD_NAME,
    api_key=config.CLOUDINARY_API_KEY,
    api_secret=config.CLOUDINARY_API_SECRET
)

router = APIRouter()

from typing import List

@router.get("/", response_model=List[DocumentOutput])
async def get_documents():
    database = db.get_db()
    cursor = database.documents.find().sort("upload_timestamp", -1)
    documents = []
    async for doc in cursor:
        doc_dict = dict(doc)
        if "_id" in doc_dict:
            doc_dict["document_id"] = str(doc_dict["_id"])
        documents.append(DocumentOutput(**doc_dict))
    return documents

@router.delete("/{document_id}")
async def delete_document(document_id: str):
    """
    Delete a document and all its related data (clauses, obligations, tasks).
    """
    database = db.get_db()

    doc = await database.documents.find_one({"document_id": document_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Guard against deleting a document with an in-flight background job.
    from app.services.job_registry import registry
    if registry.is_active(document_id):
        raise HTTPException(
            status_code=409,
            detail="Cannot delete: a background job is currently running for this document. Cancel it first.",
        )

    # Cancel any tracked job and clean up related collections.
    registry.cancel(document_id)
    deleted = {
        "clauses": await database.clauses.delete_many({"document_id": document_id}),
        "obligations": await database.obligations.delete_many({"document_id": document_id}),
        "tasks": await database.tasks.delete_many({"document_id": document_id}),
    }
    await database.documents.delete_one({"document_id": document_id})

    # Try to remove the stored file (local or Cloudinary) if present.
    file_path = doc.get("file_storage_path")
    if file_path and os.path.exists(file_path):
        try:
            os.remove(file_path)
        except Exception:
            pass

    return {
        "message": "Document deleted",
        "document_id": document_id,
        "deleted": {k: v.deleted_count for k, v in deleted.items()},
    }

@router.post("/upload", response_model=DocumentOutput)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    title: str = Form(None),
    category: str = Form(None),
    description: str = Form(None),
    source: str = Form(None),
    publication_date: str = Form(None),
    effective_date: str = Form(None),
    language: str = Form(None),
    reference_number: str = Form(None),
    intermediary_category: str = Form(None),
    # Frontend sends camelCase field names; accept both spellings.
    documentType: str = Form(None),
    publicationDate: str = Form(None),
    effectiveDate: str = Form(None),
    referenceNumber: str = Form(None),
    intermediaryCategories: str = Form(None)
):
    try:
        # Generate a unique document ID
        doc_id = str(uuid.uuid4())
        
        # Read file, compute hash and size
        file_ext = os.path.splitext(file.filename)[1]
        file_content = await file.read()
        file_size = len(file_content)
        file_hash = hashlib.sha256(file_content).hexdigest()
        
        # Upload to Cloudinary
        upload_result = cloudinary.uploader.upload(
            file_content,
            public_id=f"regtrace/{doc_id}{file_ext}",
            resource_type="auto"
        )
        
        save_path = upload_result.get("secure_url")
        
        if not save_path:
            raise Exception("Cloudinary upload failed to return a secure URL.")
            
        # Normalize: camelCase form values win, fall back to snake_case, then defaults.
        doc_type = documentType or category or "Master Circular"
        pub_date = publicationDate or publication_date
        eff_date = effectiveDate or effective_date
        ref_num = referenceNumber or reference_number
        # intermediaryCategories arrives as JSON string, e.g. '["Stock Broker"]'
        category_list = intermediaryCategories or intermediary_category
        if category_list:
            try:
                parsed = json.loads(category_list)
                if isinstance(parsed, list) and parsed:
                    intermediate = str(parsed[0]).upper()
                else:
                    intermediate = str(category_list).upper()
            except (ValueError, TypeError):
                intermediate = str(category_list).upper()
        else:
            intermediate = "STOCKBROKER"

        # Build metadata with sensible defaults so uploads work without a full form
        # (mainly for testing / quick intake). Explicit form values win over defaults.
        metadata = DocumentMetadata(
            title=title or file.filename,
            document_type=doc_type,
            source=source or "SEBI",
            language=language or "English",
            publication_date=pub_date,
            intermediary_category=intermediate,
        )
        
        # Construct output
        output = DocumentOutput(
            document_id=doc_id,
            title=title or file.filename,
            document_type=doc_type,
            intermediary_category=intermediate,
            source=metadata.source,
            publication_date=pub_date,
            file_storage_path=save_path,
            file_size=file_size,
            file_hash=file_hash,
            upload_timestamp=datetime.utcnow(),
            processing_status=DocumentStatus.PARSED,
            metadata=metadata
        )
        
        # Save to MongoDB
        database = db.get_db()
        document_dict = output.model_dump()
        document_dict["_id"] = doc_id
        
        # Parse PDF text
        pages = []
        try:
            doc = fitz.open(stream=file_content, filetype="pdf")
            for page_num in range(len(doc)):
                page = doc.load_page(page_num)
                text = page.get_text()
                pages.append({
                    "page_number": page_num + 1,
                    "text": text,
                    "tokens": len(text.split()),
                    "blocks": [block.dict() for block in extract_blocks(page)]
                })
        except Exception as e:
            logger.error("Failed to parse PDF for doc=%s: %s", doc_id, e)

        document_dict["pages"] = pages
        document_dict["job_started_at"] = datetime.utcnow().isoformat()
        await database.documents.insert_one(document_dict)
        logger.info("=== UPLOAD + PARSE DONE   doc=%s | title=%s | %d pages | %d bytes | type=%s",
                    doc_id, output.title, len(pages), file_size, output.document_type)

        # Trigger Segmentation Agent in background
        agent = ClauseSegmentationAgent()
        background_tasks.add_task(agent.run, ClauseSegmentationInput(document_id=doc_id))

        return output
    except Exception as e:
        logger.exception("Upload failed for file=%s", file.filename)
        raise HTTPException(status_code=500, detail=f"Failed to upload document: {str(e)}")
