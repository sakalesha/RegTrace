from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class ObligationBase(BaseModel):
    actor: str = Field(..., description="The entity responsible for fulfilling the obligation.")
    action: str = Field(..., description="The actionable compliance requirement extracted from the text.")
    condition: Optional[str] = Field(None, description="The condition under which the action must be performed.")
    deadline: Optional[str] = Field(None, description="The deadline for the obligation.")
    frequency: Optional[str] = Field(None, description="The frequency of the obligation (e.g. Event-driven, Continuous, Half-yearly).")
    is_mandatory: bool = Field(..., description="Whether this obligation is mandatory (e.g. 'shall', 'must').")
    confidence_score: float = Field(..., description="AI confidence score between 0.0 and 1.0.")

class ObligationCreate(ObligationBase):
    document_id: str
    clause_id: str

class ObligationResponse(ObligationBase):
    id: str = Field(..., description="MongoDB Document ID")
    document_id: str
    clause_id: str
    status: str = Field(..., description="PENDING, APPROVED, REJECTED, EDITED")
    created_at: datetime
    updated_at: datetime

    class Config:
        populate_by_name = True

class ObligationUpdate(BaseModel):
    actor: Optional[str] = None
    action: Optional[str] = None
    condition: Optional[str] = None
    deadline: Optional[str] = None
    frequency: Optional[str] = None
    is_mandatory: Optional[bool] = None
    status: Optional[str] = None
    # Review metadata (not stored on the obligation itself)
    reviewer: Optional[str] = None
    comment: Optional[str] = None

class BulkApproveRequest(BaseModel):
    obligation_ids: List[str] = Field(..., description="List of Obligation IDs to approve.")

class LLMObligationExtraction(BaseModel):
    obligations: List[ObligationBase] = Field(..., description="List of obligations extracted from the clause.")

class LLMBatchClause(BaseModel):
    clause_id: str = Field(..., description="The clause identifier this obligations list belongs to.")
    obligations: List[ObligationBase] = Field(..., description="Obligations extracted from this clause.")

class LLMBatchExtraction(BaseModel):
    clauses: List[LLMBatchClause] = Field(..., description="Per-clause obligation extractions for a batch of clauses.")
