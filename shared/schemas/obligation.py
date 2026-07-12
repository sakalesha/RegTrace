from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class Obligation(BaseModel):
    obligation_id: Optional[str] = None
    document_id: Optional[str] = None
    chunk_id: Optional[str] = None
    
    title: str
    description: str
    
    actor: str
    action: str
    object: str
    
    condition: Optional[str] = None
    frequency: Optional[str] = None
    deadline: Optional[str] = None
    
    severity: str = "MEDIUM"
    category: str = "GENERAL"
    evidence_required: Optional[str] = None
    
    confidence: float = Field(ge=0.0, le=1.0)
    
    page_number: Optional[int] = None
    heading: Optional[str] = None
    section: Optional[str] = None
    
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ObligationExtractionResult(BaseModel):
    obligations: List[Obligation]
