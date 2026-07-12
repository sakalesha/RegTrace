from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class ComplianceTask(BaseModel):
    task_id: Optional[str] = None
    document_id: Optional[str] = None
    obligation_id: str
    
    title: str
    description: str
    
    owner: Optional[str] = None
    department: Optional[str] = None
    
    priority: str = "MEDIUM" # HIGH, MEDIUM, LOW
    status: str = "PENDING_ASSIGNMENT"
    
    deadline: Optional[str] = None
    estimated_effort: Optional[str] = None
    
    dependencies: List[str] = Field(default_factory=list) # List of task titles this task depends on
    required_evidence: Optional[str] = None
    
    created_at: datetime = Field(default_factory=datetime.utcnow)

class TaskGenerationResult(BaseModel):
    tasks: List[ComplianceTask]
