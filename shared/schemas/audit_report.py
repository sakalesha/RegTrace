from typing import Dict, Any, List
from datetime import datetime
from pydantic import BaseModel, Field

class AuditReport(BaseModel):
    report_id: str
    document_id: str
    overall_compliance: float = Field(description="Percentage of compliant obligations out of total obligations.")
    executive_summary: Dict[str, Any] = Field(
        description="Summary containing total, compliant, non_compliant, pending counts"
    )
    detailed_findings: List[Dict[str, Any]] = Field(
        description="List of detailed findings for each obligation"
    )
    generated_at: datetime = Field(default_factory=datetime.utcnow)
    report_paths: Dict[str, str] = Field(description="Mapping of format (e.g. 'pdf', 'html') to file path")
    status: str = "GENERATED"
