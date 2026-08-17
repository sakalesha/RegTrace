from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class ReviewAction(BaseModel):
    review_id: str
    obligation_id: str
    document_id: Optional[str] = None
    clause_id: Optional[str] = None
    action: str  # APPROVE | REJECT | EDIT
    reviewer: Optional[str] = None
    comment: Optional[str] = None
    previous: Dict[str, Any] = Field(default_factory=dict)
    changes: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime

    class Config:
        populate_by_name = True


class ReviewListResponse(BaseModel):
    reviews: List[ReviewAction]
