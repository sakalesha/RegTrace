from enum import Enum
from typing import List, Optional, Dict
from pydantic import BaseModel


class GapType(str, Enum):
    OBLIGATION_NOT_REVIEWED = "OBLIGATION_NOT_REVIEWED"
    OBLIGATION_REJECTED = "OBLIGATION_REJECTED"
    NO_TASKS_GENERATED = "NO_TASKS_GENERATED"
    TASK_UNASSIGNED = "TASK_UNASSIGNED"
    TASK_NOT_STARTED = "TASK_NOT_STARTED"
    TASK_OVERDUE = "TASK_OVERDUE"
    EVIDENCE_MISSING = "EVIDENCE_MISSING"
    EVIDENCE_SUBMITTED_PENDING = "EVIDENCE_SUBMITTED_PENDING"
    EVIDENCE_REJECTED = "EVIDENCE_REJECTED"


class GapSeverity(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class GapItem(BaseModel):
    gap_id: str
    obligation_id: str
    obligation_action: str
    actor: str
    task_id: Optional[str] = None
    task_title: Optional[str] = None
    gap_type: GapType
    severity: GapSeverity
    department: Optional[str] = None
    category: Optional[str] = None
    priority: Optional[str] = None
    is_mandatory: bool = False
    is_overdue: bool = False
    description: str
    recommended_action: str


class GapSummaryBucket(BaseModel):
    key: str
    total: int
    critical: int = 0
    high: int = 0
    medium: int = 0
    low: int = 0


class GapOverview(BaseModel):
    total_gaps: int
    by_severity: Dict[str, int]
    by_type: List[GapSummaryBucket]
    by_department: List[GapSummaryBucket]
    top_priority_gaps: List[GapItem]
