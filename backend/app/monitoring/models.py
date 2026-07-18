from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

class GapType(str, Enum):
    MISSING_TASK = "missing_task_for_approved_obligation"
    STALE_DEADLINE = "unassigned_deadline_stale"
    ORPHANED_OBLIGATION = "orphaned_obligation"

class ComplianceGap(BaseModel):
    id: str = Field(alias="_id", default_factory=str)
    gap_id: str
    gap_type: GapType
    obligation_id: Optional[str] = None
    task_id: Optional[str] = None
    circular_id: Optional[str] = None
    description: str
    detected_at: datetime
    detected_by_run_id: str
    resolved: bool = False
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[str] = None
    resolution_note: Optional[str] = None
    
    class Config:
        populate_by_name = True

class GapResolveRequest(BaseModel):
    resolution_note: str = Field(..., min_length=1, description="A required note explaining how the gap was resolved")

class GapListResponse(BaseModel):
    gaps: List[ComplianceGap]
    total: int

class GapSummaryResponse(BaseModel):
    total_open: int
    by_type: dict[str, int]
