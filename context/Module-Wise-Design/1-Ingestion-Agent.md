# Phase 2: Solution Engineering – Part 2

## Algorithm / Agent Design: Ingestion Agent

### Objective

The Ingestion Agent is the entry point of the RegTrace compliance pipeline. Its purpose is to receive regulatory documents such as SEBI master circulars, circulars, and notifications, validate them, extract document-level metadata, store the original file securely, and create a standardized document record for downstream processing. The agent does not perform legal interpretation; instead, it ensures that every regulatory document enters the system in a consistent, traceable, and auditable format.

### Role in the Overall Architecture

The SEBI problem statement identifies that regulatory information exists as unstructured human-readable text, while compliance systems require structured machine-actionable data. The Ingestion Agent serves as the first transformation layer by converting an uploaded regulatory document into a standardized document object that can be processed by subsequent agents such as parsing, clause segmentation, obligation extraction, and task generation.

### Inputs

The Ingestion Agent accepts the following inputs:

* PDF file containing a SEBI regulatory document.
* Optional metadata provided by the user (title, source URL, publication date, intermediary category, document type).
* Upload context (organization ID, user ID, upload timestamp).

### Outputs

The agent produces a structured document record containing:

* Document ID
* Title
* Document type
* Intermediary category
* Source
* Publication date
* File storage path
* File size
* File hash
* Upload timestamp
* Processing status

The initial document status is set to **UPLOADED**, indicating that the document has been successfully registered and is ready for downstream processing.

### Functional Responsibilities

#### 1. File Validation

The uploaded file is validated before entering the pipeline.

Validation checks include:

* File format must be PDF.
* File size must be within configured limits.
* PDF must not be corrupted.
* PDF must be readable.
* Document must contain at least one page.

Invalid or corrupted files are rejected before storage.

#### 2. Document Identification

A unique document identifier is generated for every successfully ingested document.

Example format:

`DOC_20260809_001`

This identifier is used throughout the compliance pipeline to maintain traceability between clauses, obligations, tasks, evidence, and audit reports.

#### 3. Metadata Extraction

The agent extracts metadata from two sources:

* Embedded PDF metadata.
* User-provided metadata.

Extracted attributes include:

* Document title
* Author (if available)
* Creation date
* Modification date
* Page count
* Language
* Document type
* Source

For the selected project scope, documents belonging to the SEBI Master Circular for Stockbrokers are automatically tagged with the intermediary category **STOCKBROKER**.

#### 4. Duplicate Detection

To prevent redundant processing, the agent computes a SHA-256 hash of the uploaded file.

Logic:

* If the hash already exists in the document repository, the existing document record is returned.
* Otherwise, a new document record is created.

This ensures that identical SEBI circulars are processed only once.

#### 5. Original File Storage

The original PDF is stored in object storage (Cloudinary).

Storage path format:

`/documents/{document_id}.pdf`

Preserving the original file is essential for regulatory auditability and future verification.

#### 6. Document Registration

A document record is inserted into the MongoDB `documents` collection with all extracted metadata and storage references.

Example processing status:

`UPLOADED`

This status is later updated by downstream agents as the document moves through parsing, segmentation, obligation extraction, and compliance evaluation.

### Processing Algorithm

1. Receive uploaded PDF and optional metadata.
2. Validate file format and integrity.
3. Compute SHA-256 file hash.
4. Check whether the document already exists.
5. Generate a unique document ID.
6. Extract metadata from the PDF.
7. Merge extracted metadata with user-provided metadata.
8. Store the original PDF in object storage.
9. Create a standardized document record.
10. Insert the record into MongoDB.
11. Return the document record for downstream processing.

### State Transition

Document lifecycle after ingestion:

`UPLOAD REQUEST`
↓
`VALIDATED`
↓
`STORED`
↓
`DOCUMENT REGISTERED`
↓
`STATUS = UPLOADED`
↓
`HANDOFF TO PARSING AGENT`

### Error Handling

The agent handles the following failure scenarios:

| Failure Scenario           | System Action                      |
| -------------------------- | ---------------------------------- |
| Invalid file format        | Reject upload                      |
| Corrupted PDF              | Mark ingestion failed              |
| Storage failure            | Retry with exponential backoff     |
| Database insertion failure | Roll back storage operation        |
| Duplicate document         | Return existing document reference |

### Time Complexity

* File hash computation: O(n)
* File storage: O(n)
* Metadata extraction: O(1)
* Database registration: O(1)

Overall ingestion complexity: **O(n)**, where *n* is the file size.

### Design Rationale

The Ingestion Agent was designed to satisfy the auditability, consistency, and operational efficiency requirements emphasized in the SEBI problem statement. By assigning every regulatory document a unique identity, preserving the original source document, eliminating duplicate processing, and standardizing metadata before further analysis, the agent creates a reliable foundation for transforming regulatory text into structured compliance actions.

### Conclusion

The Ingestion Agent establishes a standardized and auditable entry point for SEBI regulatory documents within the Reg2Action architecture. It ensures that all uploaded regulations are validated, uniquely identified, securely stored, and registered with structured metadata, enabling downstream AI agents to perform parsing, obligation extraction, task generation, and compliance evaluation on a consistent and traceable document representation.
