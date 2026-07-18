from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class ObligationExtractionDTO(BaseModel):
    # Core extraction fields returned by LLM
    is_obligation: bool = Field(description="True if the clause contains an actual obligation or requirement.")
    obligation_text: Optional[str] = Field(None, description="The extracted text summarizing the core obligation.")
    applicable_entity: Optional[str] = Field(None, description="The entity required to perform the action (e.g., Stock Broker, Trading Member).")
    deadline: Optional[str] = Field(None, description="The deadline or timeline for the action.")
    frequency: Optional[str] = Field(None, description="How often the action must be performed (e.g., quarterly, half-yearly).")
    evidence_type: Optional[str] = Field(None, description="The type of evidence or artifact to be produced (e.g., audit report, policy).")
    penalty_referenced: bool = Field(False, description="True if a penalty or disciplinary action is referenced.")
    cross_reference_targets: List[str] = Field(default_factory=list, description="Other clauses or annexures referenced in this text.")
    llm_confidence: float = Field(default=0.5, ge=0.0, le=1.0, description="The model's self-reported confidence (0.0 to 1.0).")
    extraction_notes: List[str] = Field(default_factory=list, description="Concise explanations of why fields were extracted.")
    parent_context_used: bool = Field(False, description="True if information from the parent context was necessary to parse this clause.")

class Obligation(ObligationExtractionDTO):
    # Internal DB/tracking fields (Added by the Agent, not the LLM)
    obligation_id: Optional[str] = None
    clause_id: Optional[str] = None
    circular_id: Optional[str] = None
    clause_number: Optional[str] = None
    extraction_run_id: Optional[str] = None
    
    # Phase 2: Grounding and Quality fields
    grounding_score: float = Field(1.0, description="1.0 means all extracted fields were found in text. Lower means possible hallucination.")
    ambiguity_flags: List[str] = Field(default_factory=list, description="List of hallucinated fields or logic issues.")
    parent_clause_used: bool = Field(False, description="True if the parent clause text was required to parse this.")
    
    confidence: Optional[float] = Field(None, description="Composite confidence score calculated via rules + LLM confidence.")
    
    status: str = "PENDING_VALIDATION"
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    
    model_version: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ClauseExtractionResult(BaseModel):
    clause_id: str
    obligations: List[ObligationExtractionDTO]

class BatchExtractionResult(BaseModel):
    results: List[ClauseExtractionResult]
