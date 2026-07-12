from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field

class DocumentChunkRecord(BaseModel):
    chunk_id: str
    document_id: str
    chunk_index: int
    section_title: str
    clause_number: Optional[str] = None
    page_number: int
    text: str
    token_count: int
    status: str = "READY_FOR_EMBEDDING"
    created_at: datetime = Field(default_factory=datetime.utcnow)
