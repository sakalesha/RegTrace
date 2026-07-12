from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class GapRecord(BaseModel):
    gap_id: Optional[str] = None
    document_id: str
    
    severity: str # CRITICAL, HIGH, MEDIUM, LOW
    title: str
    description: str
    
    affected_task: str
    affected_obligation: str
    
    risk: str # HIGH, MEDIUM, LOW
    recommendation: str
    estimated_effort: str
    priority: str # P1, P2, P3
    
    detected_at: datetime = Field(default_factory=datetime.utcnow)
