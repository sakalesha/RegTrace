from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime

class EvidenceRecord(BaseModel):
    evidence_id: Optional[str] = None
    task_id: str
    obligation_id: str
    
    source_type: str # UPLOAD, POLICY, LOG, MOCK
    source_name: str
    
    reference: Optional[str] = None
    matched_text: str
    
    relevance_score: float = Field(default=0.0)
    status: str = "RETRIEVED"
    metadata: Dict[str, Any] = Field(default_factory=dict)
    
    retrieved_at: datetime = Field(default_factory=datetime.utcnow)
