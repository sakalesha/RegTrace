from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from app.schemas.task import (
    TaskStatus,
    TaskCategory,
    TaskPriority,
    TaskRecurrence,
    Department,
)


class TaskModel(BaseModel):
    """
    MongoDB model for an operational compliance task.
    """

    id: str = Field(alias="_id")  # MongoDB ObjectId string representation
    document_id: str
    obligation_id: str
    clause_id: Optional[str] = None
    title: str
    description: str
    category: TaskCategory
    priority: TaskPriority
    due_rule: Optional[str] = None
    recurrence: TaskRecurrence
    evidence_required: List[str] = Field(default_factory=list)
    clause_reference: Optional[str] = None
    page_number: Optional[int] = None
    recommended_owner: Optional[Department] = None
    assigned_department: Optional[Department] = None
    status: TaskStatus = TaskStatus.PENDING_ASSIGNMENT
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        use_enum_values = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
