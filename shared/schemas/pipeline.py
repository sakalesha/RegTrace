from pydantic import BaseModel, ConfigDict, Field
from typing import List, Dict, Any, Optional
from datetime import datetime

class PipelineConfig(BaseModel):
    pass

class AgentResult(BaseModel):
    agent_name: str
    started_at: datetime
    finished_at: datetime
    duration_seconds: float
    status: str
    error: Optional[str] = None
    output: Optional[Dict[str, Any]] = None

class ExecutionContext(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)
    
    execution_id: str
    triggered_by: Optional[str] = None
    document_id: Optional[str] = None
    config: PipelineConfig = Field(default_factory=PipelineConfig)
    
    pipeline_status: str = "PENDING"  # PENDING, RUNNING, SUCCESS, FAILED, PARTIAL
    current_agent: Optional[str] = None
    
    metadata: Dict[str, Any] = Field(default_factory=dict)
    results: List[AgentResult] = Field(default_factory=list)
    
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    overall_duration: Optional[float] = None
    
    report_id: Optional[str] = None
    report_url: Optional[str] = None
