from typing import Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field
from enum import Enum

class WorkflowState(str, Enum):
    CREATED = "CREATED"
    RUNNING = "RUNNING"
    FAILED = "FAILED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"

class WorkflowRecord(BaseModel):
    workflow_id: str
    document_id: str
    status: WorkflowState = WorkflowState.CREATED
    current_agent: Optional[str] = None
    started_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    execution_time_seconds: Optional[float] = None
    error_message: Optional[str] = None
    metrics: Dict[str, Any] = Field(default_factory=dict)

class WorkflowSummary(BaseModel):
    workflow_id: str
    document_id: str
    status: str
    agents_executed: int
    execution_time: str
    errors: int
