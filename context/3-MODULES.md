# System Modules Document

**Project:** RegTrace
**Version:** 1.0
**Status:** Pre-Implementation
**Owner:** Team RegTrace

---

# 1. Purpose

This document defines the functional modules of RegTrace and the responsibilities of each module. It provides a clear implementation boundary for backend services, frontend features, AI agents, and data management components.

The goal is to ensure that every major capability of the system is implemented as an independent, testable, and maintainable module.

---

# 2. Module Overview

RegTrace is divided into four major layers:

1. Frontend Modules
2. Backend API Modules
3. AI Workflow Modules
4. Infrastructure Modules

Overall module flow:

User Interface

↓

Document Management

↓

AI Workflow

↓

Compliance Management

↓

Reporting & Analytics

↓

Persistent Storage

---

# 3. Frontend Modules

## 3.1 Dashboard Module

### Purpose

Provide a real-time overview of compliance activity.

### Features

* Total documents
* Total obligations
* Pending tasks
* Compliance percentage
* High-risk gaps
* Recent uploads
* Processing pipeline status

### APIs

* GET /dashboard
* GET /documents
* GET /tasks

### Dependencies

* Document Module
* Task Module
* Compliance Module
* Report Module

---

## 3.2 Document Module

### Purpose

Manage regulatory document uploads and processing.

### Features

* Upload PDF
* View document metadata
* Track processing status
* View processing history
* Delete document (future)

### APIs

* POST /documents/upload
* GET /documents
* GET /documents/{id}

### Database Collections

* documents

### Dependencies

* Ingestion Agent
* Parsing Agent

---

## 3.3 Obligation Review Module

### Purpose

Review and validate extracted regulatory obligations.

### Features

* View obligations
* Filter obligations
* Approve obligation
* Reject obligation
* Edit obligation
* View confidence score

### APIs

* GET /obligations
* PUT /obligations/{id}/review

### Database Collections

* obligations
* reviews

### Dependencies

* Obligation Extraction Agent
* Human Review Agent

---

## 3.4 Task Management Module

### Purpose

Manage operational compliance tasks.

### Features

* View tasks
* Filter tasks
* Update status
* Reassign task
* View linked obligation
* View due dates

### APIs

* GET /tasks
* PUT /tasks/{id}

### Database Collections

* tasks

### Dependencies

* Task Generation Agent
* Task Assignment Agent

---

## 3.5 Evidence Module

### Purpose

Collect and manage compliance evidence.

### Features

* Upload evidence
* Add textual explanation
* View submitted evidence
* Download evidence
* Evidence history

### APIs

* POST /evidence
* GET /evidence/{task_id}

### Database Collections

* evidence

### Dependencies

* Evidence Collection Agent

---

## 3.6 Report Module

### Purpose

Generate and view audit reports.

### Features

* Generate report
* View report
* Export PDF
* Export JSON
* View historical reports

### APIs

* POST /reports/generate
* GET /reports/{id}

### Database Collections

* audit_reports

### Dependencies

* Audit Report Agent

---

# 4. Backend API Modules

## 4.1 Document Service

### Responsibilities

* Validate uploads
* Store files
* Extract metadata
* Create document records
* Trigger workflow

### Collections

* documents

### Called By

* Document Module

### Calls

* Ingestion Agent

---

## 4.2 Parsing Service

### Responsibilities

* Extract text
* OCR fallback
* Detect headings
* Generate parsed representation

### Collections

* documents

### Called By

* Workflow Orchestrator

### Calls

* Parsing Agent

---

## 4.3 Clause Service

### Responsibilities

* Create clause hierarchy
* Preserve legal structure
* Link clauses to pages

### Collections

* clauses

### Called By

* Workflow Orchestrator

### Calls

* Clause Segmentation Agent

---

## 4.4 Obligation Service

### Responsibilities

* Extract obligations
* Store obligations
* Retrieve obligations
* Filter obligations

### Collections

* obligations

### Called By

* Obligation Module

### Calls

* Obligation Extraction Agent

---

## 4.5 Review Service

### Responsibilities

* Record review actions
* Update obligation status
* Maintain review history

### Collections

* reviews
* obligations

### Called By

* Obligation Module

---

## 4.6 Task Service

### Responsibilities

* Create tasks
* Update tasks
* Assign tasks
* Retrieve tasks

### Collections

* tasks

### Called By

* Task Module

### Calls

* Task Generation Agent
* Task Assignment Agent

---

## 4.7 Evidence Service

### Responsibilities

* Store evidence
* Validate evidence
* Link evidence to tasks

### Collections

* evidence

### Called By

* Evidence Module

### Calls

* Evidence Collection Agent

---

## 4.8 Compliance Service

### Responsibilities

* Evaluate compliance
* Determine status
* Generate metrics

### Collections

* compliance_evaluations

### Called By

* Dashboard Module

### Calls

* Compliance Evaluation Agent

---

## 4.9 Gap Service

### Responsibilities

* Detect compliance gaps
* Prioritize risks
* Generate remediation recommendations

### Collections

* gaps

### Called By

* Dashboard Module

### Calls

* Gap Analysis Agent

---

## 4.10 Report Service

### Responsibilities

* Generate reports
* Retrieve reports
* Export reports

### Collections

* audit_reports

### Called By

* Report Module

### Calls

* Audit Report Agent

---

## 4.11 Search Service

### Responsibilities

* Keyword search
* Semantic search
* Clause lookup
* Obligation lookup

### Collections

* clauses
* obligations
* documents

### Called By

* Search UI

---

# 5. AI Workflow Modules

## 5.1 Ingestion Module

Input:

* PDF
* metadata

Output:

* document record

Status:

UPLOADED

---

## 5.2 Parsing Module

Input:

* document

Output:

* parsed text

Status:

PARSED

---

## 5.3 Chunking Module

Input:

* parsed text

Output:

* semantic chunks

Status:

CHUNKED

---

## 5.4 Embedding Module

Input:

* chunks

Output:

* vector embeddings

Status:

EMBEDDED

---

## 5.5 Clause Segmentation Module

Input:

* parsed text

Output:

* clause hierarchy

Status:

CLAUSES_CREATED

---

## 5.6 Obligation Extraction Module

Input:

* clauses

Output:

* obligations

Status:

OBLIGATIONS_EXTRACTED

---

## 5.7 Human Review Module

Input:

* obligations

Output:

* validated obligations

Status:

OBLIGATIONS_REVIEWED

---

## 5.8 Task Generation Module

Input:

* validated obligations

Output:

* tasks

Status:

TASKS_CREATED

---

## 5.9 Task Assignment Module

Input:

* tasks

Output:

* department ownership

Status:

TASKS_ASSIGNED

---

## 5.10 Evidence Collection Module

Input:

* uploaded evidence

Output:

* evidence records

Status:

EVIDENCE_SUBMITTED

---

## 5.11 Compliance Evaluation Module

Input:

* tasks
* evidence

Output:

* compliance results

Status:

COMPLIANCE_EVALUATED

---

## 5.12 Gap Analysis Module

Input:

* compliance results

Output:

* compliance gaps

Status:

GAP_ANALYSIS_COMPLETED

---

## 5.13 Audit Report Module

Input:

* workflow data

Output:

* audit report

Status:

REPORT_GENERATED

---

# 6. Infrastructure Modules

## 6.1 Database Module

Technology:

MongoDB

Collections:

* documents
* clauses
* obligations
* reviews
* tasks
* evidence
* compliance_evaluations
* gaps
* audit_reports

Responsibilities:

* persistence
* indexing
* transactions (where required)

---

## 6.2 File Storage Module

Technology:

Cloudflare R2 / Local Storage

Stores:

* uploaded PDFs
* OCR artifacts
* evidence files
* generated reports

Responsibilities:

* secure storage
* immutable file references
* retrieval

---

## 6.3 LLM Integration Module

Technology:

Gemini / OpenAI compatible APIs

Responsibilities:

* structured extraction
* task generation
* compliance reasoning
* report generation

Features:

* prompt versioning
* output validation
* retry logic
* rate-limit handling

---

## 6.4 Logging Module

Responsibilities:

* API logs
* workflow logs
* agent execution logs
* error logs
* audit logs

All logs contain:

* timestamp
* document ID
* module name
* trace ID

---

# 7. Module Interaction Diagram

Document Module

↓

Document Service

↓

Ingestion Module

↓

Parsing Module

↓

Clause Module

↓

Obligation Module

↓

Review Module

↓

Task Module

↓

Evidence Module

↓

Compliance Module

↓

Gap Module

↓

Report Module

---

# 8. Module Dependency Matrix

| Module     | Depends On               |
| ---------- | ------------------------ |
| Dashboard  | Compliance, Task, Report |
| Document   | Ingestion                |
| Obligation | Clause, Extraction       |
| Review     | Obligation               |
| Task       | Review                   |
| Evidence   | Task                     |
| Compliance | Evidence                 |
| Gap        | Compliance               |
| Report     | Gap, Compliance          |

---

# 9. Ownership Boundaries

Frontend Team:

* Dashboard
* Documents
* Obligations
* Tasks
* Evidence
* Reports

Backend Team:

* API modules
* Services
* Database
* Storage

AI Team:

* All workflow modules
* Prompt engineering
* Extraction logic
* Evaluation logic

Shared:

* Search
* Logging
* Report generation

---

# 10. Testing Strategy

Each module must support:

### Unit Testing

* business logic
* validation
* transformations

### Integration Testing

* API endpoints
* database interaction
* agent interaction

### End-to-End Testing

* complete document workflow
* obligation review
* task execution
* report generation

---

# 11. Summary

RegTrace is organized into independent functional modules covering user interface, backend services, AI workflow, and infrastructure. Every module has a clearly defined responsibility, API boundary, database interaction, and dependency chain, enabling parallel development, isolated testing, and future scalability while preserving a deterministic and auditable compliance workflow.
