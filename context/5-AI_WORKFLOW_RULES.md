# AI Workflow Rules

**Project:** RegTrace
**Version:** 1.0
**Status:** Pre-Implementation
**Owner:** Team RegTrace

---

# 1. Purpose

This document defines the operational rules governing the AI workflow engine of RegTrace. It specifies how agents communicate, validate outputs, preserve context, handle failures, manage state transitions, and maintain auditability across the compliance pipeline.

The objective is to ensure that every AI-driven decision is **deterministic, traceable, reviewable, and recoverable**.

---

# 2. AI Workflow Overview

The RegTrace AI engine processes regulatory documents through a sequence of specialized agents.

Document Upload

↓

Ingestion Agent

↓

Parsing Agent

↓

Chunking Agent

↓

Embedding Agent

↓

Clause Segmentation Agent

↓

Obligation Extraction Agent

↓

Human Review Agent

↓

Task Generation Agent

↓

Task Assignment Agent

↓

Evidence Collection Agent

↓

Compliance Evaluation Agent

↓

Gap Analysis Agent

↓

Audit Report Agent

Each agent performs exactly one responsibility and passes structured output to the next stage.

---

# 3. Core Workflow Principles

The workflow engine follows these principles:

* Single Responsibility per agent
* Structured input and output
* Deterministic processing
* Immutable audit records
* Human-in-the-loop validation
* Retry-safe execution
* Idempotent workflow stages
* Explicit state transitions
* No hidden agent communication
* Complete traceability

---

# 4. Agent Communication Rules

## Rule 1: Agents Never Call Other Agents Directly

Agents are isolated.

Correct:

Workflow Orchestrator → Agent A → Workflow Orchestrator → Agent B

Incorrect:

Agent A → Agent B

---

## Rule 2: All Communication Uses Structured Objects

Agents exchange validated schemas.

Example:

DocumentInput

ClauseInput

ObligationOutput

TaskOutput

Raw strings or dictionaries must never be used between agents.

---

## Rule 3: Outputs Must Be Self-Contained

Every output object must contain all information required by downstream agents.

Example:

Obligation object:

* obligation_id
* clause_id
* text
* responsible_entity
* deadline
* evidence_required
* confidence

---

# 5. Workflow Orchestrator Rules

The orchestrator is responsible for:

* executing agents in order
* validating outputs
* updating document status
* logging execution
* handling retries
* handling failures
* preserving workflow history

The orchestrator is the only component allowed to transition document states.

---

# 6. Input Validation Rules

Before any agent executes:

* required fields must exist
* schema must validate
* document reference must exist
* previous stage must be completed
* document status must be valid

If validation fails:

* agent execution stops
* workflow enters FAILED state
* error is logged
* retry becomes available

---

# 7. Output Validation Rules

Every agent output must satisfy:

* Pydantic schema validation
* required fields present
* data types correct
* confidence scores valid
* references resolvable
* no malformed structures

Invalid outputs are rejected before persistence.

---

# 8. Context Preservation Rules

Each workflow execution carries a shared context object.

Context contains:

* document_id
* document_metadata
* processing_status
* page_mapping
* heading_structure
* clause_map
* workflow_trace_id
* timestamps

Agents may read context.

Only the orchestrator may modify workflow metadata.

---

# 9. Confidence Score Rules

AI-generated entities must include confidence values.

Range:

0.0 – 1.0

Interpretation:

| Score     | Meaning           |
| --------- | ----------------- |
| 0.90–1.00 | High confidence   |
| 0.75–0.89 | Medium confidence |
| 0.50–0.74 | Low confidence    |
| <0.50     | Requires review   |

Rules:

* obligations < 0.75 automatically enter review queue
* tasks generated from low-confidence obligations remain pending
* compliance evaluation confidence is stored separately

---

# 10. Human Review Rules

Human review is mandatory for:

* low-confidence obligations
* ambiguous clauses
* conflicting regulatory interpretations
* obligations affecting multiple departments
* obligations with uncertain deadlines

Reviewer actions:

* approve
* edit
* reject

Edited obligations become the canonical version.

Original AI output must remain preserved for audit purposes.

---

# 11. State Transition Rules

Document lifecycle:

UPLOADED

↓

PARSED

↓

CHUNKED

↓

EMBEDDED

↓

CLAUSES_CREATED

↓

OBLIGATIONS_EXTRACTED

↓

OBLIGATIONS_REVIEWED

↓

TASKS_CREATED

↓

TASKS_ASSIGNED

↓

EVIDENCE_SUBMITTED

↓

COMPLIANCE_EVALUATED

↓

GAP_ANALYSIS_COMPLETED

↓

REPORT_GENERATED

Rules:

* stages cannot be skipped
* stages cannot move backward
* only the orchestrator changes state
* failed stages transition to FAILED

---

# 12. Retry Rules

An agent may retry when:

* LLM timeout
* temporary API failure
* network interruption
* transient database failure

Maximum retries:

3

Retry strategy:

1. immediate retry
2. exponential backoff
3. final failure

Retries must be idempotent.

No duplicate obligations, tasks, or reports may be created.

---

# 13. Idempotency Rules

Running the same stage multiple times must produce the same logical result.

Examples:

Re-running Clause Segmentation:

* update existing clauses
* do not create duplicates

Re-running Task Generation:

* update existing tasks
* preserve task IDs

---

# 14. Persistence Rules

Each completed stage must persist its output before the next stage begins.

Persisted outputs include:

* parsed text
* chunks
* embeddings
* clauses
* obligations
* reviews
* tasks
* evidence
* compliance results
* gaps
* reports

No downstream agent may depend on in-memory-only data.

---

# 15. Audit Trail Rules

Every AI decision must be recorded.

Record:

* agent name
* input reference
* output reference
* timestamp
* model version
* prompt version
* confidence
* reviewer (if applicable)

Audit records are immutable.

---

# 16. Prompt Management Rules

Each agent has one prompt file.

Location:

backend/prompts/

Example:

obligation_extraction.md

Rules:

* prompts are version controlled
* prompt version stored with outputs
* prompt changes require testing
* prompts must be deterministic
* prompts must request structured JSON output

---

# 17. LLM Usage Rules

LLMs may be used for:

* obligation extraction
* task generation
* compliance reasoning
* remediation recommendations
* report summarization

LLMs must not be used for:

* document state transitions
* ID generation
* database writes
* authorization
* workflow control

Business-critical decisions remain deterministic.

---

# 18. Hallucination Prevention Rules

Every LLM output must be validated.

Requirements:

* extract only text supported by the document
* preserve clause references
* preserve page references
* preserve legal wording where required
* do not invent deadlines
* do not invent departments
* do not invent obligations

If uncertain:

* lower confidence
* request human review

---

# 19. Error Handling Rules

Each agent returns:

Success

{

"status": "success",

"output": {}

}

Failure

{

"status": "failure",

"error": {

"code": "PARSING_ERROR",

"message": "Unable to extract text",

"retryable": true

}

}

The orchestrator determines whether execution continues.

---

# 20. Logging Rules

Every agent execution logs:

* trace_id
* document_id
* agent_name
* input_id
* output_id
* execution_time
* model_used
* prompt_version
* result
* error (if any)

Log levels:

DEBUG

INFO

WARNING

ERROR

CRITICAL

---

# 21. Performance Rules

Target execution times:

| Agent                 | Target   |
| --------------------- | -------- |
| Ingestion             | < 5 sec  |
| Parsing               | < 20 sec |
| Chunking              | < 5 sec  |
| Embedding             | < 30 sec |
| Clause Segmentation   | < 15 sec |
| Obligation Extraction | < 60 sec |
| Task Generation       | < 20 sec |
| Compliance Evaluation | < 30 sec |
| Gap Analysis          | < 15 sec |
| Report Generation     | < 20 sec |

Total workflow target:

< 3 minutes per document.

---

# 22. Parallel Execution Rules

Current version:

Sequential workflow.

Future optimization:

Parallelizable stages:

* Embedding
* Clause Segmentation
* Obligation Extraction across independent chunks

Rules:

* preserve deterministic ordering
* merge results before persistence
* maintain stable clause IDs

---

# 23. Security Rules

Agents must never:

* execute uploaded code
* access external websites without approval
* expose API keys
* expose internal prompts
* modify audit records

Documents are treated as confidential regulatory data.

---

# 24. Workflow Recovery Rules

If a workflow stops:

1. Load persisted context
2. Identify last successful stage
3. Resume from next stage
4. Preserve trace ID
5. Preserve audit history

Recovery must never repeat completed stages unnecessarily.

---

# 25. Future Workflow Extensions

Planned enhancements:

* regulatory change detection agent
* obligation comparison agent
* policy mapping agent
* notification agent
* continuous monitoring agent
* predictive compliance agent
* enterprise integration agents

New agents must follow all rules in this document.

---

# 26. Summary

RegTrace uses a deterministic multi-agent workflow where every stage operates independently, communicates through validated schemas, persists its outputs, and records a complete audit trail. The orchestrator controls execution order, state transitions, retries, and recovery, while human review ensures that critical regulatory obligations remain legally defensible and operationally reliable.
