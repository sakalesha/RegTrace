# Phase 2: Solution Engineering – Part 2

## Algorithm / Agent Design: Parsing Agent

### Objective

The Parsing Agent is responsible for converting the uploaded **SEBI Master Circular for Stock Brokers ** from PDF format into a structured textual representation while preserving its legal hierarchy, numbering system, page references, annexures, and regulatory citations. Unlike the Ingestion Agent, which only validates and registers the document, the Parsing Agent produces the machine-readable text that forms the foundation for clause segmentation, obligation extraction, task generation, and compliance evaluation.

### Role in the Overall Architecture

The SEBI problem statement highlights that regulatory information is primarily available as **unstructured human-readable text**, whereas compliance systems require **structured and machine-actionable information**. The Parsing Agent performs the first semantic transformation by extracting text from the PDF and preserving the document’s legal structure. It receives a document whose status is **UPLOADED** from the Ingestion Agent and produces a structured parsed document that is passed to the Chunking Agent.

Pipeline transition:

`Ingestion Agent → Parsing Agent → Chunking Agent`

### Document Analysis Findings

Analysis of the uploaded SEBI Master Circular revealed several structural characteristics that directly influenced the design of the Parsing Agent.

#### Hierarchical Chapter Structure

The circular is organized into major chapters identified by **Roman numerals**, such as:

* Registration of Stock Brokers
* Investor Grievance Redressal
* Default Related Provisions

These chapter headings define the highest level of legal organization within the document and must be preserved during parsing.

#### Multi-Level Numbered Sections

Each chapter contains nested numbering patterns such as:

* 23
* 23.1
* 23.1.1
* 23.1.1(a)

This numbering hierarchy represents distinct regulatory provisions and is essential for downstream clause segmentation and obligation mapping.

#### Regulatory References and Footnotes

Many sections reference earlier SEBI circulars, amendment notifications, and historical regulatory documents. These references appear as inline citations and footnotes and provide important legal context. The parser should capture these references separately rather than removing them during normalization.

#### Long-Form Compliance Obligations

The circular contains extensive imperative language, including expressions such as **“Stock Brokers shall…”**, **“Stock Exchanges shall ensure…”**, and **“All registered stock brokers shall…”**. These obligation-bearing paragraphs must remain intact because later agents depend on sentence-level legal language for obligation extraction.

#### Annexures and Tabular Content

The document includes annexures, reporting formats, compliance templates, and tabular data. These sections contain operational requirements and reporting fields that may later be converted into compliance tasks. Therefore, annexure identifiers and table text should be preserved.

#### Page-Level Traceability

The circular spans more than two hundred pages, and each regulatory provision must remain traceable to its original page. Page references are necessary for audit reports, legal verification, and evidence collection.

### Inputs

The Parsing Agent receives:

* `document_id`
* PDF file path from object storage
* Document metadata from the `documents` collection

### Outputs

The Parsing Agent generates a structured parsed document containing:

* Document ID
* Page number
* Chapter title
* Section number
* Section title
* Paragraph text
* Regulatory references and footnotes
* Extraction method
* Parsing confidence
* Processing status

The output status is updated to **PARSED**.

### Functional Responsibilities

#### 1. PDF Loading

The agent opens the original PDF document using a PDF parsing library such as **PyMuPDF (fitz)** and verifies that the file exists, is readable, and contains valid pages.

#### 2. Text Extraction

For every page, the agent extracts embedded digital text while preserving reading order, paragraph boundaries, numbering, and punctuation.

#### 3. OCR Fallback

If a page contains insufficient extractable text or primarily consists of scanned images, the agent performs Optical Character Recognition (OCR) using an OCR engine such as **RapidOCR or Tesseract**. The extraction method is recorded for auditability.

#### 4. Chapter Detection

The agent detects **Roman numeral chapter headings** and records them as top-level structural nodes.

Examples:

* I. Registration of Stock Brokers
* VII. Investor Grievance Redressal

#### 5. Section Detection

The parser identifies hierarchical section numbers such as **23**, **23.1**, **23.1.1**, and **23.1.1(a)** and associates each section with its corresponding title and textual content.

#### 6. Reference Extraction

The agent captures references to earlier SEBI circulars, amendment notifications, and regulatory footnotes and stores them as structured references linked to the corresponding section.

#### 7. Annexure and Table Preservation

Annexure titles, reporting formats, and table text are retained in the parsed output so that structured compliance information is not lost during extraction.

#### 8. Page Mapping

Every extracted text block is linked to its original page number, enabling precise legal traceability and audit support.

### Processing Algorithm

The Parsing Agent operates using the following workflow:

1. Receive `document_id` and PDF path.
2. Load the PDF document.
3. Iterate through each page.
4. Extract digital text.
5. If extraction quality is low, perform OCR.
6. Detect chapter headings using Roman numeral patterns.
7. Detect hierarchical section numbering.
8. Normalize whitespace while preserving legal formatting.
9. Extract regulatory references and footnotes.
10. Preserve annexure and table content.
11. Store structured page objects.
12. Concatenate page objects into a parsed document.
13. Save the parsed document.
14. Update document status to **PARSED**.

### Structured Output Model

A parsed page object contains:

* `page_number`
* `chapter_title`
* `section_number`
* `section_title`
* `paragraph_text`
* `references`
* `extraction_method`

This structured representation becomes the input for the Chunking Agent and Clause Segmentation Agent.

### State Transition

Document lifecycle after parsing:

`UPLOADED`
↓
`PARSED`
↓
`HANDOFF TO CHUNKING AGENT`

### Error Handling

| Failure Scenario         | System Action                               |
| ------------------------ | ------------------------------------------- |
| PDF cannot be opened     | Mark document as `PARSE_FAILED`             |
| Digital extraction fails | Execute OCR fallback                        |
| OCR failure              | Store partial output and flag affected page |
| Corrupted page           | Continue parsing remaining pages            |
| Empty document           | Mark parsing failed                         |
| Processing timeout       | Retry with exponential backoff              |

### Time Complexity

For a document containing **P pages** with average page text length **T**:

* Digital text extraction: **O(P × T)**
* OCR fallback (worst case): proportional to page image size

The overall parsing process is effectively **linear with document size**, making it suitable for large regulatory documents such as the SEBI Master Circular.

### Design Rationale

The SEBI Master Circular already contains a rich legal hierarchy consisting of chapters, sections, nested clauses, annexures, and regulatory references. Therefore, the Parsing Agent is designed as a **structure-preserving parser** rather than a simple text extractor. Preserving numbering, headings, page references, and regulatory citations significantly improves the accuracy of downstream agents responsible for clause segmentation, obligation extraction, task generation, and audit reporting.

### Conclusion

The Parsing Agent transforms the uploaded SEBI Master Circular into a structured and legally traceable textual representation. By preserving chapter hierarchy, section numbering, regulatory references, annexures, tables, and page mappings, it provides the standardized foundation required for subsequent AI agents to identify clauses, extract obligations, generate compliance tasks, and evaluate regulatory compliance with full audit traceability.
