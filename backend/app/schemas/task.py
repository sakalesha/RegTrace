from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from enum import Enum


class TaskStatus(str, Enum):
    PENDING_ASSIGNMENT = "PENDING_ASSIGNMENT"
    ASSIGNED = "ASSIGNED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    OVERDUE = "OVERDUE"
    CANCELLED = "CANCELLED"


class TaskCategory(str, Enum):
    REPORTING = "Reporting"
    RECORD_KEEPING = "Record Keeping"
    AUDIT = "Audit"
    GRIEVANCE_REDRESSAL = "Grievance Redressal"
    CYBERSECURITY = "Cybersecurity"
    DISCLOSURE = "Disclosure"
    MONITORING = "Monitoring"
    GOVERNANCE = "Governance"
    OPERATIONAL_COMPLIANCE = "Operational Compliance"


class TaskPriority(str, Enum):
    CRITICAL = "Critical"
    HIGH = "High"
    MEDIUM = "Medium"
    LOW = "Low"


class TaskRecurrence(str, Enum):
    ONE_TIME = "One-time"
    EVENT_BASED = "Event-based"
    MONTHLY = "Monthly"
    QUARTERLY = "Quarterly"
    HALF_YEARLY = "Half-yearly"
    ANNUAL = "Annual"
    CONTINUOUS_MONITORING = "Continuous Monitoring"


class Department(str, Enum):
    COMPLIANCE = "Compliance"
    OPERATIONS = "Operations"
    KYC = "KYC/Client Onboarding"
    IT = "IT"
    INFORMATION_SECURITY = "Information Security"
    FINANCE = "Finance"
    LEGAL = "Legal"
    RISK = "Risk"


class TaskBase(BaseModel):
    title: str = Field(..., description="Short operational title of the task.")
    description: str = Field(..., description="Detailed description of the work to be performed.")
    category: TaskCategory = Field(..., description="Standardized compliance category.")
    priority: TaskPriority = Field(..., description="Derived priority of the task.")
    due_rule: Optional[str] = Field(None, description="Regulatory timeline as a human-readable rule.")
    recurrence: TaskRecurrence = Field(..., description="How often the task repeats.")
    evidence_required: List[str] = Field(default_factory=list, description="Documentation or evidence needed for compliance.")
    clause_reference: Optional[str] = Field(None, description="Originating clause number in the source document.")
    page_number: Optional[int] = Field(None, description="Page number of the originating clause.")
    recommended_owner: Optional[Department] = Field(None, description="Department recommended by the generation agent.")
    assigned_department: Optional[Department] = Field(None, description="Department finalized by the assignment agent.")


class TaskCreate(TaskBase):
    document_id: str
    obligation_id: str
    clause_id: Optional[str] = None


class TaskResponse(TaskBase):
    id: str = Field(..., description="MongoDB Document ID")
    document_id: str
    obligation_id: str
    clause_id: Optional[str] = None
    status: TaskStatus = Field(..., description="Task lifecycle status.")
    created_at: datetime
    updated_at: datetime

    class Config:
        populate_by_name = True
        use_enum_values = True


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[TaskCategory] = None
    priority: Optional[TaskPriority] = None
    due_rule: Optional[str] = None
    recurrence: Optional[TaskRecurrence] = None
    evidence_required: Optional[List[str]] = None
    clause_reference: Optional[str] = None
    page_number: Optional[int] = None
    assigned_department: Optional[Department] = None
    status: Optional[TaskStatus] = None


class TaskAssignRequest(BaseModel):
    department: Department = Field(..., description="Department to assign the task to.")


class LLMTask(BaseModel):
    title: str
    description: str
    category: TaskCategory
    priority: TaskPriority
    due_rule: Optional[str] = None
    recurrence: TaskRecurrence
    evidence_required: List[str] = Field(default_factory=list)
    clause_reference: Optional[str] = None
    page_number: Optional[int] = None
    recommended_owner: Department


class LLMTaskGeneration(BaseModel):
    tasks: List[LLMTask] = Field(..., description="List of operational tasks generated from the obligation.")


class LLMBatchObligation(BaseModel):
    obligation_id: str = Field(..., description="The obligation ID this tasks list belongs to.")
    tasks: List[LLMTask] = Field(..., description="Tasks generated from this obligation.")


class LLMBatchTaskGeneration(BaseModel):
    obligations: List[LLMBatchObligation] = Field(..., description="Per-obligation task generations for a batch of obligations.")
