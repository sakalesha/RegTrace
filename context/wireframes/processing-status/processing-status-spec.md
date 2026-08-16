# Document Processing Status Implementation Specification

**Project:** RegTrace
**Page:** Document Processing Status
**Version:** 1.0
**Status:** Ready for Implementation

---

# Objective

Implement the **Document Processing Status** page exactly according to the approved wireframe.

This page provides real-time visibility into the RegTrace AI pipeline after a regulatory document has been uploaded. It allows compliance officers to monitor processing progress, inspect pipeline stages, review extracted metadata, and proceed to obligation review once processing is complete.

This page represents the transition between **document ingestion** and **obligation review**.

---

# Technology Stack

* React
* Vite
* TypeScript
* Tailwind CSS
* React Router DOM
* Lucide React
* Recharts (optional for progress visualization)
* React Query (future integration)
* WebSocket / SSE ready architecture

---

# Layout

The page uses the standard application shell.

```text
+--------------------------------------------------------------+
| Top Navigation (Fixed)                                       |
+-------------+------------------------------------------------+
|             |                                                |
| Sidebar     | Processing Header                              |
| (Fixed)     |                                                |
|             | Document Summary Card                          |
|             |                                                |
|             | Pipeline Progress Tracker                      |
|             |                                                |
|             | Current Stage Details                          |
|             |                                                |
|             | Processing Log / Timeline                      |
|             |                                                |
|             | Extracted Metadata Preview                     |
|             |                                                |
|             | Action Buttons                                 |
|             |                                                |
+-------------+------------------------------------------------+
```

Only the content area scrolls.

---

# Processing Header

## Title

**Document Processing**

## Subtitle

Dynamic status message.

Examples:

* Processing regulatory document
* AI pipeline in progress
* Preparing compliance obligations

## Status Badge

Possible values:

* Uploading
* Parsing
* Chunking
* Embedding
* Segmenting
* Extracting
* Awaiting Review
* Completed
* Failed

The badge should update dynamically.

---

# Document Summary Card

Display uploaded document information.

Fields:

* Document title
* File name
* File size
* Upload timestamp
* Regulatory source
* Document type
* Intermediary category
* Publication date

Example:

* SEBI Master Circular 2026
* SEBI_Master_Circular_2026.pdf
* 2.4 MB
* Uploaded 10:02 AM
* Source: SEBI
* Type: Master Circular
* Category: Stock Broker
* Published: 2026-08-01

This panel is read-only.

---

# Pipeline Progress Tracker

Implement a horizontal multi-step progress tracker.

## Stages

1. Upload
2. Parse
3. Chunk
4. Embed
5. Segment Clauses
6. Extract Obligations
7. Human Review
8. Generate Tasks

## Stage States

### Completed

* Green
* Check icon

### Active

* Blue
* Animated indicator

### Pending

* Gray

Display overall completion percentage.

Example:

**63% Complete**

---

# Current Stage Details

Display a detailed panel for the active stage.

Example:

**Extracting Obligations**

Include:

* Stage title
* Stage description
* Current AI activity
* Estimated remaining time
* Progress metrics

Example metrics:

* Pages processed: 48 / 76
* Clauses segmented: 312
* Obligations extracted: 187
* Average confidence: 0.87

This section updates dynamically.

---

# Processing Log / Timeline

Display a vertical chronological log.

Each log entry contains:

* Timestamp
* Stage
* Status
* Description

Example:

10:02:15

Upload

Completed

Document uploaded successfully

10:02:21

Parse

In Progress

Extracting text from PDF

10:02:45

Parse

Completed

OCR applied to scanned pages

10:03:18

Segment Clauses

Completed

312 clauses identified

10:03:52

Extract Obligations

In Progress

Extracting regulatory obligations

The newest event appears at the top.

---

# Extracted Metadata Preview

Display metadata identified during processing.

Fields:

* Document ID
* Language
* Total pages
* Chapters detected
* Sections detected
* Clauses detected
* OCR confidence
* Duplicate similarity score
* Processing engine version

Example:

* Document ID: doc_2026_001
* Language: English
* Pages: 76
* Chapters: 12
* Sections: 48
* Clauses: 312
* OCR Confidence: 98%
* Duplicate Similarity: 4%
* Engine: v1.4

This panel is read-only.

---

# Action Buttons

## Primary

**View Extracted Obligations**

Enabled only when:

* Obligation extraction completed

Routes to:

`/documents/:id/obligations`

## Secondary

**Return to Documents**

Routes to:

`/documents`

## Tertiary

**Cancel Processing**

Visible only while processing.

Action:

* Cancel current processing job
* Return to documents list

---

# Completion State

When processing completes successfully:

Display:

**Processing Completed Successfully**

Summary metrics:

* Total clauses detected
* Total obligations extracted
* Tasks generated
* Human review items
* Processing duration

Example:

* Clauses: 312
* Obligations: 187
* Tasks: 64
* Human Review Items: 23
* Duration: 2m 41s

The primary button becomes enabled.

---

# Error State

If processing fails:

Display:

* Failed stage
* Error message
* Retry Processing button
* Download Error Log link

Example:

**Failed during OCR processing**

Reason:

Unable to process encrypted pages.

Buttons:

* Retry Processing
* Return to Documents

---

# Data Model

Example processing status interface:

```ts
interface ProcessingStatus {
  documentId: string;
  stage:
    | 'UPLOAD'
    | 'PARSE'
    | 'CHUNK'
    | 'EMBED'
    | 'SEGMENT'
    | 'OBLIGATION'
    | 'REVIEW'
    | 'TASK'
    | 'COMPLETED'
    | 'FAILED';
  progress: number;
  pagesProcessed: number;
  totalPages: number;
  clausesDetected: number;
  obligationsExtracted: number;
  estimatedRemainingSeconds?: number;
}
```

---

# Mock API Contract

GET

`/api/v1/documents/:id/status`

Response:

```json
{
  "documentId": "doc_2026_001",
  "stage": "OBLIGATION",
  "progress": 63,
  "pagesProcessed": 48,
  "totalPages": 76,
  "clausesDetected": 312,
  "obligationsExtracted": 187
}
```

---

# Polling / Live Updates

Initial implementation:

* Poll every 2 seconds

Future:

* Replace with WebSocket or Server-Sent Events

The UI should update incrementally without page refresh.

---

# Responsive Behavior

## Desktop

* Horizontal progress tracker
* Full-width panels
* Timeline stacked below stage details

## Tablet

* Sidebar collapsible
* Progress tracker compressed
* Panels become single-column

## Mobile

* Sidebar drawer
* Vertical progress tracker
* Timeline stacked
* Buttons full width

---

# Accessibility

Requirements:

* Progress tracker keyboard accessible
* Timeline readable by screen readers
* Live region for stage updates
* Proper heading hierarchy
* Buttons with aria-label
* Status changes announced

---

# Performance Requirements

* Efficient polling
* Memoized progress tracker
* Virtualize long processing logs if needed
* Avoid unnecessary full-page re-renders

---

# Acceptance Criteria

Implementation is accepted only if:

* Layout matches approved wireframe
* Progress tracker displays all stages
* Active stage updates correctly
* Timeline renders chronologically
* Metadata panel displays extracted values
* Completion state works
* Error state works
* Buttons enable/disable correctly
* Responsive behavior matches specification
* No redesign is introduced

---

# Deliverables

* DocumentProcessingStatusPage
* ProgressTracker component
* StageDetails component
* ProcessingTimeline component
* MetadataPreview component
* CompletionSummary component
* ErrorState component
* Polling / status update integration
* Routing integration
