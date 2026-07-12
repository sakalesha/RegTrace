from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field

class DocumentMetadataInput(BaseModel):
    title: Optional[str] = None
    source: Optional[str] = None
    document_type: Optional[str] = None
    publication_date: Optional[str] = None
    language: str = "English"

class DocumentRecord(BaseModel):
    document_id: str
    title: str
    source: str
    document_type: str
    publication_date: str
    language: str = "English"
    status: str = "INGESTED"
    file_path: str
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)
    checksum: str
    created_by: str = "system"

class DocumentNode(BaseModel):
    node_id: str
    document_id: str
    page_number: int
    heading: Optional[str] = None
    section: Optional[str] = None
    content: str
    
class DocumentChunk(BaseModel):
    chunk_id: str
    document_id: str
    chunk_index: int
    text: str
    page: Optional[int] = None
    heading: Optional[str] = None
    section: Optional[str] = None
    parent_section: Optional[str] = None
    status: str = "CHUNKED"
