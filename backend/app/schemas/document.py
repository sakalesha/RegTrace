from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum

class DocumentStatus(str, Enum):
    UPLOADED = "UPLOADED"
    PARSED = "PARSED"
    CHUNKED = "CHUNKED"
    EMBEDDED = "EMBEDDED"
    CLAUSES_CREATED = "CLAUSES_CREATED"
    EXTRACTING_OBLIGATIONS = "EXTRACTING_OBLIGATIONS"
    OBLIGATIONS_EXTRACTED = "OBLIGATIONS_EXTRACTED"
    EXTRACTION_FAILED = "EXTRACTION_FAILED"
    PROCESSING_CANCELLED = "PROCESSING_CANCELLED"
    OBLIGATIONS_REVIEWED = "OBLIGATIONS_REVIEWED"
    GENERATING_TASKS = "GENERATING_TASKS"
    TASKS_GENERATION_FAILED = "TASKS_GENERATION_FAILED"
    TASKS_CREATED = "TASKS_CREATED"
    TASKS_ASSIGNED = "TASKS_ASSIGNED"
    EVIDENCE_SUBMITTED = "EVIDENCE_SUBMITTED"
    COMPLIANCE_EVALUATED = "COMPLIANCE_EVALUATED"
    GAP_ANALYSIS_COMPLETED = "GAP_ANALYSIS_COMPLETED"
    REPORT_GENERATED = "REPORT_GENERATED"
    FAILED = "FAILED"

class DocumentMetadata(BaseModel):
    title: Optional[str] = None
    author: Optional[str] = None
    creation_date: Optional[str] = None
    modification_date: Optional[str] = None
    page_count: Optional[int] = None
    language: Optional[str] = None
    document_type: Optional[str] = None
    source: Optional[str] = None
    publication_date: Optional[str] = None
    intermediary_category: Optional[str] = "STOCKBROKER"

class IngestionInput(BaseModel):
    # This represents the data given to the agent
    file_path: str # Path to the temporarily uploaded file or content
    file_name: str
    metadata: Optional[DocumentMetadata] = Field(default_factory=DocumentMetadata)
    organization_id: Optional[str] = None
    user_id: Optional[str] = None
    upload_timestamp: datetime = Field(default_factory=datetime.utcnow)

class DocumentOutput(BaseModel):
    # This represents the standardized document record produced by the agent
    document_id: str
    title: Optional[str]
    document_type: Optional[str]
    intermediary_category: str
    source: Optional[str]
    publication_date: Optional[str]
    file_storage_path: str
    file_size: int
    file_hash: str
    upload_timestamp: datetime
    processing_status: DocumentStatus
    metadata: Optional[DocumentMetadata]
