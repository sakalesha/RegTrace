from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from app.schemas.document import DocumentStatus, DocumentMetadata

class DocumentModel(BaseModel):
    """
    MongoDB model for a document.
    """
    document_id: str
    title: Optional[str]
    document_type: Optional[str]
    intermediary_category: str
    source: Optional[str]
    publication_date: Optional[str]
    file_storage_path: str
    file_size: int
    file_hash: str
    upload_timestamp: datetime
    processing_status: DocumentStatus
    metadata: Optional[DocumentMetadata]
    pages: Optional[list] = []
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
