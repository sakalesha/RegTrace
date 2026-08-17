from enum import Enum
from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field


class ReportType(str, Enum):
    DOCUMENT = "DOCUMENT"
    ORGANIZATION = "ORGANIZATION"


class ReportSummary(BaseModel):
    total_obligations: int = 0
    compliant: int = 0
    partially_compliant: int = 0
    non_compliant: int = 0
    not_started: int = 0
    overall_compliance_score: float = 0.0
    total_gaps: int = 0
    critical_gaps: int = 0
    high_gaps: int = 0
    medium_gaps: int = 0
    low_gaps: int = 0


class ReportObligation(BaseModel):
    obligation_id: str
    action: str
    actor: str
    is_mandatory: bool = False
    status: str
    is_overdue: bool = False
    tasks_total: int = 0
    tasks_completed: int = 0
    evidence_accepted: int = 0
    department: Optional[str] = None


class AuditReport(BaseModel):
    report_id: str
    report_type: ReportType
    document_id: Optional[str] = None
    title: str
    generated_at: datetime
    generated_by: Optional[str] = "system"
    summary: ReportSummary
    compliance: Dict[str, Any] = Field(default_factory=dict)
    gaps: Dict[str, Any] = Field(default_factory=dict)
    obligations: List[ReportObligation] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class ReportListItem(BaseModel):
    report_id: str
    title: str
    report_type: ReportType
    document_id: Optional[str] = None
    generated_at: datetime
    overall_compliance_score: float = 0.0
    total_gaps: int = 0
