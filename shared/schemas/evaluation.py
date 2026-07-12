from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class ComplianceEvaluationRecord(BaseModel):
    evaluation_id: Optional[str] = None
    task_id: str
    document_id: str
    
    status: str # COMPLIANT, PARTIALLY_COMPLIANT, NON_COMPLIANT, UNKNOWN
    confidence: float = Field(ge=0.0, le=1.0)
    
    reason: str
    missing_requirements: List[str] = Field(default_factory=list)
    recommended_actions: List[str] = Field(default_factory=list)
    
    evaluated_at: datetime = Field(default_factory=datetime.utcnow)

class ComplianceEvaluationResult(BaseModel):
    status: str
    confidence: float
    reason: str
    missing_requirements: List[str]
    recommended_actions: List[str]
