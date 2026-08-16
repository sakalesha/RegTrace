from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from app.schemas.evidence import EvidenceStatus


class EvidenceModel(BaseModel):
    """
    MongoDB model for a compliance evidence record.
    """

    id: str = Field(alias="_id")  # MongoDB ObjectId string representation
    task_id: str
    document_id: str
    obligation_id: str
    file_name: str
    file_type: Optional[str] = None
    file_url: str
    file_size: Optional[int] = None
    description: Optional[str] = None
    submitted_by: Optional[str] = None
    status: EvidenceStatus = EvidenceStatus.SUBMITTED
    clause_reference: Optional[str] = None
    page_number: Optional[int] = None
    submitted_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        use_enum_values = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
