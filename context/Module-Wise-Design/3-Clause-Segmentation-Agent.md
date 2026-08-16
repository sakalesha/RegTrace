# Phase 2: Solution Engineering – Part 2

## Algorithm / Agent Design: Clause Segmentation Agent

### Objective

The Clause Segmentation Agent is responsible for dividing the parsed **SEBI Master Circular for Stock Brokers** into discrete legal clauses, where each clause represents a single regulatory provision, obligation, permission, prohibition, definition, exception, or procedural requirement. Unlike the Parsing Agent, which extracts and preserves the document structure, the Clause Segmentation Agent converts that structure into individually addressable legal units that can be analyzed by downstream AI agents.

### Role in the Overall Architecture

The SEBI problem statement requires transforming unstructured regulatory documents into machine-actionable compliance workflows. The Clause Segmentation Agent performs the critical transformation from **structured document text** to **structured legal clauses**. It receives a document whose status is **PARSED** from the Parsing Agent and produces a collection of uniquely identifiable clause objects that become the primary input for the Obligation Extraction Agent.

Pipeline transition:

`Parsing Agent → Clause Segmentation Agent → Obligation Extraction Agent`

### Document Analysis Findings

Analysis of the uploaded SEBI Master Circular revealed several structural characteristics that directly influenced the design of the Clause Segmentation Agent.

#### Hierarchical Legal Numbering

The circular consistently uses multi-level numbering patterns such as:

* 23
* 23.1
* 23.1.1
* 23.1.1(a)

Each numbered level represents a distinct regulatory provision and must be preserved during segmentation.

#### Chapter–Section–Clause Hierarchy

The document follows a predictable legal hierarchy consisting of:

* Roman numeral chapters
* Numbered sections
* Decimal sub-sections
* Multi-level clauses
* Alphabetical sub-clauses

This hierarchy provides essential legal context and must be maintained for accurate obligation mapping.

#### Obligation-Bearing Clauses

Many regulatory requirements appear within deeply nested sub-clauses rather than section headings. Examples include statements such as:

* “Stock Brokers shall…”
* “Stock Exchanges shall ensure…”
* “The authorization shall be signed…”

These provisions represent independently enforceable compliance obligations and therefore should be segmented individually.

#### Regulatory References

Individual clauses frequently contain references to earlier SEBI circulars and amendment notifications. These references provide legal context and should remain attached to the corresponding clause rather than being removed during segmentation.

#### Annexure References

The circular contains numerous references to annexures, reporting formats, compliance templates, and operational forms. These annexure references should be preserved as metadata so that downstream agents can connect obligations to supporting documentation.

#### Temporal and Conditional Language

Several clauses contain compliance deadlines and conditional requirements such as:

* within twenty-four hours
* within fifteen working days
* within seven working days
* latest by seventh of succeeding month

These temporal expressions are critical for compliance evaluation and must remain intact within each segmented clause.

### Inputs

The Clause Segmentation Agent receives:

* `document_id`
* Parsed document produced by the Parsing Agent
* Page-wise structured text
* Detected chapter headings
* Detected section numbers

### Outputs

The agent generates a collection of structured **Clause Objects**, each containing:

* Clause ID
* Document ID
* Chapter
* Section number
* Parent section
* Clause title
* Clause text
* Page number
* Regulatory references
* Annexure references
* Processing status

The output status is updated to **SEGMENTED**.

### Functional Responsibilities

#### 1. Chapter Detection

The agent identifies Roman numeral chapter headings and establishes the top-level legal context for all subsequent clauses.

#### 2. Section Detection

The agent detects numbered sections and sub-sections such as **23**, **23.1**, **23.1.1**, and **23.1.1(a)** and preserves their hierarchical relationships.

#### 3. Clause Boundary Identification

The parser determines where each legal provision begins and ends by analyzing numbering patterns, indentation, bullet structures, paragraph boundaries, and formatting cues.

#### 4. Hierarchy Preservation

Each segmented clause retains its parent-child relationship so that downstream agents can understand the legal context surrounding the provision.

#### 5. Reference Attachment

References to SEBI circulars, amendment notifications, and historical regulatory documents are extracted and stored as metadata associated with the relevant clause.

#### 6. Annexure Linking

References to annexures, forms, reporting templates, and compliance formats are captured and linked to the clause object.

#### 7. Page Mapping

Every clause is linked to its original page number, enabling precise traceability to the source document during audits and compliance reviews.

#### 8. Unique Clause Identification

A globally unique **clause_id** is generated for every segmented clause using the document identifier and hierarchical clause number.

Example:

`DOC_001_23.1.1.a`

### Processing Algorithm

The Clause Segmentation Agent operates using the following workflow:

1. Receive the parsed document.
2. Detect chapter headings.
3. Detect numbered sections.
4. Detect nested numbering patterns.
5. Identify clause boundaries.
6. Preserve parent-child hierarchy.
7. Attach regulatory references.
8. Attach annexure references.
9. Record original page numbers.
10. Generate unique clause identifiers.
11. Store structured clause objects.
12. Update document status to **SEGMENTED**.

### Structured Output Model

Each Clause Object contains:

* `clause_id`
* `document_id`
* `chapter`
* `section_number`
* `parent_section`
* `title`
* `text`
* `page_number`
* `references`
* `annexure_refs`
* `status`

This structured representation becomes the direct input for the Obligation Extraction Agent.

### State Transition

Document lifecycle after clause segmentation:

`PARSED`
↓
`SEGMENTED`
↓
`HANDOFF TO OBLIGATION EXTRACTION AGENT`

### Error Handling

| Failure Scenario             | System Action                                  |
| ---------------------------- | ---------------------------------------------- |
| Missing section number       | Infer hierarchy from surrounding context       |
| Broken numbering sequence    | Flag clause for review                         |
| Clause split across pages    | Merge text across page boundaries              |
| Reference extraction failure | Preserve raw reference text                    |
| Annexure parsing ambiguity   | Store unresolved metadata for later processing |

### Time Complexity

For **N parsed text blocks**:

* Chapter detection: **O(N)**
* Section detection: **O(N)**
* Clause boundary detection: **O(N)**
* Metadata attachment: **O(N)**

The overall segmentation process is **linear with document size**, making it suitable for large regulatory documents such as the SEBI Master Circular.

### Design Rationale

The SEBI Master Circular already encodes legal semantics through its hierarchical numbering system. A clause such as **76.3** represents a specific independently enforceable regulatory provision. Therefore, the Clause Segmentation Agent is designed to preserve this hierarchy exactly and use it as the canonical identifier for downstream obligation extraction, task generation, evidence collection, compliance evaluation, and audit reporting. Preserving legal numbering significantly improves traceability and ensures that every generated compliance task can be linked directly to the original SEBI provision.

### Conclusion

The Clause Segmentation Agent transforms the parsed SEBI Master Circular into a collection of structured and independently addressable legal clauses. By preserving chapter hierarchy, section numbering, parent-child relationships, regulatory references, annexure links, and page mappings, it creates the structured legal foundation required for accurate obligation extraction, compliance task generation, evidence tracking, and audit-ready regulatory traceability.
