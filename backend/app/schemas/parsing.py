from pydantic import BaseModel, Field
from typing import List, Optional
from app.schemas.document import DocumentStatus

class ParsingInput(BaseModel):
    document_id: str

class ParsedLine(BaseModel):
    text: str
    x0: float = 0.0
    y0: float = 0.0
    size: float = 0.0
    bold: bool = False
    font: Optional[str] = None

class ParsedPage(BaseModel):
    page_number: int
    text: str
    blocks: List[ParsedLine] = Field(default_factory=list)

class ParsingOutput(BaseModel):
    document_id: str
    pages: List[ParsedPage]
    total_pages: int
    processing_status: DocumentStatus
