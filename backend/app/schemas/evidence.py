from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from enum import Enum


class EvidenceStatus(str, Enum):
    SUBMITTED = "SUBMITTED"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"


class EvidenceBase(BaseModel):
    task_id: str = Field(..., description="The compliance task this evidence proves.")
    document_id: str = Field(..., description="The source regulatory document.")
    obligation_id: str = Field(..., description="The obligation this evidence satisfies.")
    file_name: str = Field(..., description="Original uploaded file name.")
    file_type: Optional[str] = Field(None, description="MIME type of the uploaded file.")
    file_url: str = Field(..., description="Persistent storage reference/URL for the file.")
    file_size: Optional[int] = Field(None, description="Size of the uploaded file in bytes.")
    description: Optional[str] = Field(None, description="Submitter's textual explanation.")
    submitted_by: Optional[str] = Field(None, description="Identifier of the submitting user.")


class EvidenceCreate(EvidenceBase):
    pass


class EvidenceResponse(EvidenceBase):
    id: str = Field(..., description="MongoDB Document ID")
    status: EvidenceStatus = Field(..., description="Evidence lifecycle status.")
    clause_reference: Optional[str] = Field(None, description="Originating clause reference.")
    page_number: Optional[int] = Field(None, description="Page number of the originating clause.")
    submitted_at: datetime = Field(..., description="When the evidence was submitted.")
    updated_at: datetime = Field(..., description="When the evidence record was last updated.")

    class Config:
        populate_by_name = True
        use_enum_values = True


class EvidenceUpdate(BaseModel):
    status: Optional[EvidenceStatus] = None
    description: Optional[str] = None
    submitted_by: Optional[str] = None
