from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field

class DocumentSection(BaseModel):
    heading: str
    content: str
    page: int

class ParsedDocumentRecord(BaseModel):
    document_id: str
    title: str
    pages: int
    sections: List[DocumentSection]
    status: str = "PARSED"
    parsed_at: datetime = Field(default_factory=datetime.utcnow)
