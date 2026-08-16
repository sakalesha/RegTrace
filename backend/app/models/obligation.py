from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class ObligationModel(BaseModel):
    """
    MongoDB model for an extracted obligation.
    """
    id: str = Field(alias="_id") # MongoDB ObjectId string representation
    document_id: str
    clause_id: str
    actor: str
    action: str
    condition: Optional[str] = None
    deadline: Optional[str] = None
    frequency: Optional[str] = None
    is_mandatory: bool
    confidence_score: float = 0.0
    status: str = "PENDING" # PENDING, APPROVED, REJECTED, EDITED
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
