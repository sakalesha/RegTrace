from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class ComplianceTask(BaseModel):
    task_id: Optional[str] = None
    document_id: Optional[str] = None
    obligation_id: str
    
    title: str
    description: str
    
    owner_role: str = "Compliance Officer"
    owner: Optional[str] = None
    department: Optional[str] = None
    
    priority: str = "MEDIUM" # HIGH, MEDIUM, LOW
    status: str = "OPEN"
    
    frequency: Optional[str] = None
    deadline: Optional[datetime] = None
    estimated_effort: Optional[str] = None
    
    dependencies: List[str] = Field(default_factory=list) # List of task titles this task depends on
    evidence_required: Optional[str] = None
    
    trace: Optional[dict] = None
    
    created_at: datetime = Field(default_factory=datetime.utcnow)

class TaskGenerationResult(BaseModel):
    tasks: List[ComplianceTask]
