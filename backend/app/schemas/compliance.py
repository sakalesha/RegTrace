from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel


class ComplianceStatus(str, Enum):
    NOT_STARTED = "NOT_STARTED"
    PARTIALLY_COMPLIANT = "PARTIALLY_COMPLIANT"
    COMPLIANT = "COMPLIANT"
    NON_COMPLIANT = "NON_COMPLIANT"


class ObligationCompliance(BaseModel):
    obligation_id: str
    document_id: str
    action: str
    actor: str
    is_mandatory: bool
    deadline: Optional[str] = None
    status: ComplianceStatus
    is_overdue: bool = False
    tasks_total: int = 0
    tasks_completed: int = 0
    evidence_total: int = 0
    evidence_accepted: int = 0
    department: Optional[str] = None
    category: Optional[str] = None
    priority: Optional[str] = None


class ComplianceBreakdownItem(BaseModel):
    key: str
    total: int
    compliant: int
    partial: int
    non_compliant: int
    not_started: int
    score: float = 0.0


class CriticalGap(BaseModel):
    obligation_id: str
    action: str
    department: Optional[str] = None
    status: ComplianceStatus
    is_overdue: bool = False
    is_mandatory: bool = False


class ComplianceOverview(BaseModel):
    overall_score: float
    total_obligations: int
    status_counts: Dict[str, int]
    by_department: List[ComplianceBreakdownItem]
    by_category: List[ComplianceBreakdownItem]
    by_priority: List[ComplianceBreakdownItem]
    critical_gaps: List[CriticalGap]
