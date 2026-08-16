from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class ClauseBase(BaseModel):
    chapter: Optional[str] = None
    section_number: Optional[str] = None
    parent_section: Optional[str] = None
    title: Optional[str] = None
    heading: Optional[str] = None
    clause_type: Optional[str] = None
    hierarchy_level: Optional[int] = None
    start_line: Optional[int] = None
    end_line: Optional[int] = None
    chapter_title: Optional[str] = None
    text: str
    page_number: int
    has_obligations: bool = False
    references: List[str] = Field(default_factory=list)
    annexure_refs: List[str] = Field(default_factory=list)

class ClauseSchema(ClauseBase):
    clause_id: str
    document_id: str
    status: str = "PENDING_OBLIGATION_EXTRACTION"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
class ClauseSegmentationInput(BaseModel):
    document_id: str

class ClauseSegmentationOutput(BaseModel):
    document_id: str
    total_clauses: int
    clauses: List[ClauseSchema]
    processing_status: str
