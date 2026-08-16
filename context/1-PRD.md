# Product Requirements Document (PRD)

**Project:** RegTrace
**Version:** 1.0
**Status:** Pre-Implementation
**Owner:** Team RegTrace

## 1. Purpose

RegTrace is an AI-powered compliance platform that transforms SEBI regulatory documents into structured operational actions for stockbrokers. The system reads regulatory text, extracts obligations, generates compliance tasks, evaluates submitted evidence, identifies compliance gaps, and produces audit-ready reports.

This PRD defines the product scope, user requirements, functional requirements, non-functional requirements, workflows, and success metrics before implementation begins.

---

# 2. Problem Background

SEBI issues circulars, master circulars, notifications, and guidelines that contain mandatory compliance obligations for market intermediaries. Compliance teams currently interpret these documents manually, which creates delays, inconsistencies, and audit challenges.

The SEBI problem statement specifically highlights the need to bridge unstructured regulatory text and machine-actionable compliance workflows. Reg2Action addresses this gap by converting regulatory intent into operational compliance actions. The project scope is limited to **Stockbrokers** and the **SEBI Master Circular for Stockbrokers** as the regulatory corpus.

---

# 3. Product Vision

Enable stockbrokers to move from **regulatory document upload** to **operational compliance execution** through an AI-driven workflow that is structured, auditable, and efficient.

---

# 4. Product Goals

## Primary Goals

* Convert SEBI regulatory text into structured obligations.
* Generate actionable compliance tasks.
* Track evidence and compliance status.
* Identify compliance gaps automatically.
* Produce audit-ready reports.

## Secondary Goals

* Reduce manual interpretation effort.
* Improve compliance consistency.
* Increase audit transparency.
* Build a searchable regulatory knowledge base.

---

# 5. Target Users

## Compliance Officer

Responsibilities:

* Upload regulatory documents
* Review extracted obligations
* Monitor compliance status
* Generate audit reports

## Compliance Analyst

Responsibilities:

* Validate obligations
* Execute compliance tasks
* Upload evidence
* Respond to compliance gaps

## Auditor / Management

Responsibilities:

* Review compliance dashboards
* Access audit reports
* Monitor organizational compliance health

---

# 6. Product Scope

## In Scope

* PDF upload
* Document ingestion
* Clause segmentation
* Obligation extraction
* Human review
* Task generation
* Task assignment
* Evidence submission
* Compliance evaluation
* Gap analysis
* Audit report generation
* Dashboard and analytics
* Obligation search

## Out of Scope (Version 1)

* Multi-regulator support
* Real-time SEBI update feeds
* Enterprise integrations
* Email notifications
* Mobile application
* Authentication and role management
* Workflow approvals

---

# 7. Success Metrics

## Functional

| Metric                          | Target |
| ------------------------------- | ------ |
| Clause segmentation accuracy    | >= 90% |
| Obligation extraction accuracy  | >= 85% |
| Task generation success rate    | >= 95% |
| Audit report generation success | >= 99% |

## Operational

| Metric                   | Target      |
| ------------------------ | ----------- |
| Document processing time | < 3 minutes |
| Search response time     | < 2 seconds |
| Dashboard load time      | < 3 seconds |

---

# 8. User Journey

1. Upload SEBI Master Circular PDF
2. System extracts text and metadata
3. Clauses are segmented
4. Obligations are extracted
5. Compliance officer reviews obligations
6. Tasks are generated
7. Tasks are assigned
8. Evidence is submitted
9. Compliance is evaluated
10. Gaps are identified
11. Audit report is generated

---

# 9. Functional Requirements

## FR-1 Document Upload

The system shall:

* Accept PDF documents
* Extract metadata
* Store original files
* Create a document record
* Track processing status

**Output**

* Document ID
* Metadata
* Upload timestamp
* Processing status

---

## FR-2 Clause Segmentation

The system shall:

* Detect chapters
* Detect sections
* Detect clauses and sub-clauses
* Preserve legal hierarchy
* Associate clauses with page numbers

**Output**

Structured clause tree.

---

## FR-3 Obligation Extraction

The system shall:

* Identify mandatory obligations
* Detect responsible entity
* Detect timelines
* Detect evidence requirements
* Assign confidence scores

**Output**

Structured obligation objects.

---

## FR-4 Human Review

The system shall:

* Display extracted obligations
* Allow approve/edit/reject actions
* Record review history
* Prioritize low-confidence obligations

**Output**

Validated obligations.

---

## FR-5 Task Generation

The system shall convert obligations into operational tasks.

Each task shall include:

* Title
* Description
* Priority
* Due date
* Related obligation

**Output**

Task records.

---

## FR-6 Task Assignment

The system shall assign tasks using predefined department rules.

Departments include:

* Compliance
* Operations
* IT
* Finance
* Risk

**Output**

Assigned task records.

---

## FR-7 Evidence Submission

The system shall:

* Accept file uploads
* Accept text explanations
* Store evidence metadata
* Link evidence to tasks
* Maintain audit history

**Output**

Evidence records.

---

## FR-8 Compliance Evaluation

The system shall evaluate task completion and evidence.

Supported statuses:

* Compliant
* Partially Compliant
* Non-Compliant
* Pending Review

**Output**

Compliance evaluation records.

---

## FR-9 Gap Analysis

The system shall identify:

* Missing evidence
* Missing tasks
* Overdue obligations
* High-risk compliance gaps

The system shall also generate remediation recommendations.

**Output**

Gap analysis report.

---

## FR-10 Audit Report

The system shall generate reports containing:

* Document summary
* Obligation summary
* Task summary
* Evidence summary
* Compliance metrics
* Gap analysis
* Audit trail

Supported formats:

* PDF
* JSON

---

## FR-11 Dashboard

The dashboard shall display:

* Total documents
* Total obligations
* Compliance percentage
* Pending tasks
* High-risk gaps
* Recent uploads
* Pipeline status

---

## FR-12 Search

The system shall support:

* Document search
* Clause search
* Obligation search
* Keyword search
* Status filtering
* Category filtering

---

# 10. Non-Functional Requirements

## Performance

* Upload processing < 3 minutes
* Search latency < 2 seconds
* Dashboard loading < 3 seconds

## Scalability

* Thousands of obligations
* Multiple concurrent documents
* Concurrent API requests
* Horizontal backend scaling

## Reliability

* Persistent storage
* Recoverable processing
* Idempotent operations
* Audit-safe records

## Maintainability

* Modular agent architecture
* Versioned prompts
* Centralized schemas
* Standardized APIs

## Security

* Secure document storage
* Input validation
* API access control
* Audit logging
* Immutable compliance history

---

# 11. Data Model Overview

Core entities:

* Document
* Clause
* Obligation
* Review
* Task
* Assignment
* Evidence
* ComplianceEvaluation
* Gap
* AuditReport

Relationships:

Document → Clauses

Clause → Obligations

Obligation → Tasks

Task → Evidence

Task → ComplianceEvaluation

ComplianceEvaluation → Gap

Document → AuditReport

---

# 12. Workflow

Document Upload

↓

Text Extraction

↓

Clause Segmentation

↓

Obligation Extraction

↓

Human Review

↓

Task Generation

↓

Task Assignment

↓

Evidence Submission

↓

Compliance Evaluation

↓

Gap Analysis

↓

Audit Report Generation

---

# 13. Acceptance Criteria

A document is successfully processed when:

* Metadata is extracted
* Clauses are created
* Obligations are generated
* Tasks are generated
* Dashboard reflects the document

A compliance cycle is successfully completed when:

* Evidence is submitted
* Compliance is evaluated
* Gaps are identified
* Audit report is generated

---

# 14. Risks and Mitigation

| Risk              | Impact               | Mitigation                    |
| ----------------- | -------------------- | ----------------------------- |
| Poor OCR quality  | Incorrect extraction | OCR fallback                  |
| LLM hallucination | Wrong obligations    | Structured output validation  |
| Ambiguous clauses | Incorrect tasks      | Human review                  |
| Large documents   | Slow processing      | Chunked pipeline              |
| Missing evidence  | False compliance     | Mandatory evidence validation |

---

# 15. Future Roadmap

## Version 2

* Regulatory change detection
* Multi-document comparison
* Notification engine
* User authentication
* Role-based access control

## Version 3

* Multi-regulator support
* Enterprise integrations
* Continuous compliance monitoring
* Predictive compliance analytics

---

# 16. Product Summary

Reg2Action converts SEBI regulatory documents into structured obligations, executable compliance tasks, compliance evaluations, gap analyses, and audit-ready reports. The platform provides an end-to-end AI workflow from regulatory text ingestion to operational compliance action, specifically designed for stockbrokers operating under the SEBI Master Circular framework.
