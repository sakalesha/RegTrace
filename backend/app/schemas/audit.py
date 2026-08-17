from typing import Optional, List, Dict, Any

from pydantic import BaseModel, Field
from datetime import datetime


class AuditLogEntry(BaseModel):
    id: Optional[str] = None
    event_type: str
    document_id: Optional[str] = None
    actor: Optional[str] = None
    meta: Dict[str, Any] = Field(default_factory=dict)
    created_at: Optional[datetime] = None


class AuditLogListResponse(BaseModel):
    total: int
    results: List[AuditLogEntry]
