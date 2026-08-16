# Phase 2: Solution Engineering – Part 2

## Algorithm / Agent Design: Evidence Collection Agent

### Objective

The Evidence Collection Agent is responsible for storing, validating, and managing the documentary evidence that a stock broker submits to demonstrate fulfilment of the compliance tasks generated from the **SEBI Master Circular for Stock Brokers**. Unlike the Task Generation Agent, which converts regulatory obligations into operational work items, the Evidence Collection Agent captures the proof that the work has been performed. The collected evidence becomes the factual basis for the Compliance Evaluation Agent, which later determines whether each obligation has been satisfied.

### Role in the Overall Architecture

The SEBI problem statement emphasizes **evidence-based compliance management**, maintaining audit trails, and demonstrating regulatory compliance through documented proof. Stock brokers are repeatedly required to preserve audit reports, client records, grievance records, regulatory submission receipts, board resolutions, policy documents, screenshots, system logs, and training records. The Evidence Collection Agent operationalizes this requirement by capturing, storing, and organizing that documentary proof in a retrievable, auditable, and task-linked form.

Pipeline transition:

`Task Assignment Agent → Evidence Collection Agent → Compliance Evaluation Agent`

### Document Analysis Findings

Analysis of the uploaded SEBI Master Circular revealed several characteristics that directly influenced the design of the Evidence Collection Agent.

#### Evidence-Oriented Compliance

The circular repeatedly requires stock brokers to maintain records, submit reports, preserve documents, conduct audits, publish disclosures, and maintain operational logs. Examples include internal audit reports, system audit reports, client records, grievance records, cybersecurity reports, website disclosures, and regulatory submissions. Compliance under SEBI is therefore fundamentally **evidence-based**, requiring documentary proof of fulfilment.

#### Task-Linked Evidence

Each generated compliance task specifies the documentary evidence required to prove compliance, including audit reports, client ledgers, regulatory submission receipts, board resolutions, screenshots, system logs, policy documents, and complaint resolution records. The Evidence Collection Agent must therefore associate each submitted item with its originating task, obligation, clause, and page reference.

#### Mixed Evidence Formats

Evidence submitted by stock brokers may arrive as PDF documents, scanned files, screenshots, email acknowledgements, system logs, spreadsheets, regulatory submission receipts, policy documents, or board resolutions. The agent must accept a broad range of file types while capturing the metadata necessary for later evaluation.

#### Need for Human Review

Not all submitted evidence is automatically accepted. Compliance officers may need to verify that a submission is relevant, complete, and authentic before it is treated as valid proof. The agent therefore records a reviewable lifecycle for every evidence item rather than assuming automatic acceptance.

#### Auditability Requirement

SEBI inspections require demonstrating compliance against specific regulatory clauses. Every evidence submission must therefore remain traceable to the originating task, obligation, clause number, page number, source document, submitter, and timestamp.

### Inputs

The Evidence Collection Agent receives:

* `document_id`
* `task_id`
* `obligation_id`
* Uploaded file (raw bytes)
* File metadata (name, type, size)
* Optional textual explanation
* Submitter identifier

### Outputs

The agent produces a structured **Evidence Record**, containing:

* Evidence ID
* Task ID
* Obligation ID
* Document ID
* File name
* File type
* File URL (storage reference)
* File size
* Description / textual explanation
* Submitter
* Submission timestamp
* Evidence status
* Clause reference
* Page number

The output status is updated to **EVIDENCE_SUBMITTED** when the first evidence for a document is captured.

### Functional Responsibilities

#### 1. Evidence Validation

The agent validates the uploaded file, including file type, size, and required metadata, before storage.

#### 2. Evidence Storage

The agent stores the uploaded file to persistent file storage (Cloudinary / local fallback) and records the resulting storage reference.

#### 3. Evidence Metadata Capture

The agent captures and persists file metadata such as file name, type, and size alongside the storage reference.

#### 4. Task Linking

The agent associates each evidence item with its originating compliance task, obligation, clause, and page reference.

#### 5. Explanation Capture

The agent records the submitter's optional textual explanation describing how the evidence demonstrates compliance.

#### 6. Status Assignment

Each evidence item is initialized in a **SUBMITTED** state and may later transition to **ACCEPTED** or **REJECTED** through compliance review.

#### 7. Audit History Preservation

The agent records the submitter and submission timestamp for every evidence item, preserving an immutable audit trail.

#### 8. Document State Update

When the first evidence item is captured for a document, the agent transitions the document processing status to **EVIDENCE_SUBMITTED**.

### Processing Algorithm

The Evidence Collection Agent operates using the following workflow:

1. Receive task and obligation references.
2. Validate the uploaded file.
3. Store the file and obtain a storage reference.
4. Capture file metadata.
5. Build the structured evidence record.
6. Link the evidence to the originating task and obligation.
7. Record the submitter and timestamp.
8. Initialize the evidence status as **SUBMITTED**.
9. Persist the evidence record.
10. Update the linked task status if required.
11. Update the document status to **EVIDENCE_SUBMITTED** on first capture.
12. Preserve the audit trail.

### Structured Output Model

Each Evidence Record contains:

* `evidence_id`
* `task_id`
* `obligation_id`
* `document_id`
* `file_name`
* `file_type`
* `file_url`
* `file_size`
* `description`
* `submitted_by`
* `status`
* `clause_reference`
* `page_number`
* `submitted_at`

This structured representation becomes the direct input for the Compliance Evaluation Agent.

### State Transition

Document lifecycle after evidence collection:

`TASKS_ASSIGNED`
↓
`EVIDENCE_SUBMITTED`
↓
`HANDOFF TO COMPLIANCE EVALUATION AGENT`

### Error Handling

| Failure Scenario          | System Action                                     |
| ------------------------- | ------------------------------------------------- |
| Invalid file type         | Reject upload with validation error               |
| Oversized file            | Reject upload with size-limit error               |
| Unknown task reference    | Reject upload with task-not-found error           |
| Storage failure           | Flag evidence as failed, allow retry              |
| Missing metadata          | Derive from filename where possible, else reject  |
| Duplicate submission      | Record as a new evidence item (no dedupe)         |

### Time Complexity

For a single evidence upload:

* Validation: **O(1)**
* Storage: **O(1)** (network-bound)
* Record creation: **O(1)**

For **E evidence items** on a document:

* Retrieval by task: **O(E)**

The evidence collection process is **constant-time per upload** and **linear for retrieval**, making it suitable for large compliance workloads.

### Design Rationale

The SEBI Master Circular defines compliance primarily through **demonstrable evidence rather than declarations**. Most obligations require documentation, reporting, audit records, disclosures, or operational artifacts that must be preserved and retrievable. The Evidence Collection Agent is therefore designed as a **deterministic evidence management engine** that captures, stores, links, and audits documentary proof rather than generating content with a language model. This deterministic design keeps the evidence layer reliable, inexpensive, and fully auditable, while producing structured records that the Compliance Evaluation Agent can consume for automated compliance assessment.

### Conclusion

The Evidence Collection Agent transforms submitted documentary files into structured, task-linked evidence records with complete regulatory traceability. By validating, storing, capturing metadata, linking to tasks, recording explanations, preserving audit history, and managing reviewable status, the agent provides the factual foundation required for automated compliance evaluation, gap analysis, and audit readiness within the RegTrace architecture.
