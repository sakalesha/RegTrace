# Document Processing Status AI Implementation Prompt

**Project:** RegTrace
**Page:** Document Processing Status
**Target:** AI Coding Agent (Cursor / Claude Code / Windsurf / GitHub Copilot / OpenAI Codex)
**Version:** 1.0

---

# Objective

Implement the **RegTrace Document Processing Status page** exactly according to the approved wireframe and implementation specification.

This is a **frontend implementation task**, not a UI redesign task.

Do **not** redesign, simplify, or reinterpret the layout. Preserve the section order, hierarchy, spacing, responsive behavior, and component structure defined in `processing-status-wireframe.md` and `processing-status-spec.md`.

This page represents the AI workflow monitor shown immediately after a regulatory document is uploaded.

---

# Technology Stack

Use:

* React
* Vite
* TypeScript
* Tailwind CSS
* React Router DOM
* Lucide React
* Recharts (optional)
* React Query (prepare for future API integration)

Assume the application already includes:

* Fixed top navigation
* Fixed left sidebar
* Shared `AppLayout` component
* Existing routing infrastructure

---

# Page Route

Create the page at:

`/documents/:documentId/status`

---

# Layout Requirements

Implement this structure exactly.

```text
Top Navigation (fixed)

Sidebar (fixed)

Main Content
 ├── Processing Header
 ├── Document Summary Card
 ├── Pipeline Progress Tracker
 ├── Current Stage Details
 ├── Processing Timeline
 ├── Extracted Metadata Preview
 └── Action Buttons
```

Only the content area should scroll vertically.

---

# Components to Create

Create reusable components.

## Layout

* AppLayout
* TopNavbar
* Sidebar

## Processing Page

* DocumentProcessingStatusPage
* ProcessingHeader
* DocumentSummaryCard
* PipelineProgressTracker
* StageDetailsPanel
* ProcessingTimeline
* MetadataPreview
* CompletionSummary
* ErrorState
* ProcessingActionBar

Keep components modular and reusable.

---

# Processing Header

Display:

**Title**

Document Processing

**Subtitle**

Dynamic processing message such as:

* Processing regulatory document
* AI pipeline in progress
* Preparing compliance obligations

**Status Badge**

Support the following states:

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

Display the uploaded document information.

Use mock data:

```ts
const documentSummary = {
  title: 'SEBI Master Circular 2026',
  fileName: 'SEBI_Master_Circular_2026.pdf',
  fileSize: '2.4 MB',
  uploadedAt: '10:02 AM',
  source: 'SEBI',
  documentType: 'Master Circular',
  intermediaryCategory: 'Stock Broker',
  publicationDate: '2026-08-01'
};
```

Render the information in a clean two-column card layout.

---

# Pipeline Progress Tracker

Create a horizontal multi-step progress component.

Stages:

1. Upload
2. Parse
3. Chunk
4. Embed
5. Segment Clauses
6. Extract Obligations
7. Human Review
8. Generate Tasks

State behavior:

### Completed

* Green
* Check icon

### Active

* Blue
* Animated indicator

### Pending

* Gray

Display:

**63% Complete**

The active stage should be:

**Extract Obligations**

---

# Current Stage Details

Display a detailed processing panel.

Title:

**Extracting Obligations**

Show:

* Stage description
* Current AI activity
* Estimated remaining time
* Progress metrics

Use mock metrics:

* Pages processed: 48 / 76
* Clauses segmented: 312
* Obligations extracted: 187
* Average confidence: 0.87
* Estimated remaining: 38s

This panel should look like a live processing monitor.

---

# Processing Timeline

Render a vertical chronological timeline.

Use mock events:

```ts
const timeline = [
  {
    time: '10:03:52',
    stage: 'Extract Obligations',
    status: 'In Progress',
    description: 'Extracting regulatory obligations'
  },
  {
    time: '10:03:18',
    stage: 'Segment Clauses',
    status: 'Completed',
    description: '312 clauses identified'
  },
  {
    time: '10:02:45',
    stage: 'Parse',
    status: 'Completed',
    description: 'OCR applied to scanned pages'
  },
  {
    time: '10:02:21',
    stage: 'Parse',
    status: 'In Progress',
    description: 'Extracting text from PDF'
  },
  {
    time: '10:02:15',
    stage: 'Upload',
    status: 'Completed',
    description: 'Document uploaded successfully'
  }
];
```

Newest events appear first.

---

# Extracted Metadata Preview

Display read-only metadata.

Use mock values:

```ts
const metadata = {
  documentId: 'doc_2026_001',
  language: 'English',
  pages: 76,
  chapters: 12,
  sections: 48,
  clauses: 312,
  ocrConfidence: '98%',
  duplicateSimilarity: '4%',
  engineVersion: 'v1.4'
};
```

Render in a structured information card.

---

# Completion State

Implement a separate completion state.

When stage becomes:

`COMPLETED`

Display:

**Processing Completed Successfully**

Show summary:

* Clauses detected: 312
* Obligations extracted: 187
* Tasks generated: 64
* Human review items: 23
* Processing duration: 2m 41s

Enable the primary action button.

---

# Error State

Implement a failure state.

Display:

**Processing Failed**

Example:

Failed during OCR processing

Reason:

Unable to process encrypted pages.

Buttons:

* Retry Processing
* Return to Documents

Optional link:

Download Error Log

---

# Action Buttons

## Primary

**View Extracted Obligations**

Initially disabled.

Enable only when:

* Stage = COMPLETED

Route:

`/documents/:documentId/obligations`

## Secondary

**Return to Documents**

Route:

`/documents`

## Tertiary

**Cancel Processing**

Visible only while processing.

Action:

* Simulate cancellation
* Return to documents list

---

# Mock Processing State

Use:

```ts
const processingStatus = {
  stage: 'OBLIGATION',
  progress: 63,
  pagesProcessed: 48,
  totalPages: 76,
  clausesDetected: 312,
  obligationsExtracted: 187,
  estimatedRemainingSeconds: 38
};
```

---

# Polling Simulation

Simulate live updates.

Every 2 seconds:

* Increase progress
* Update active stage
* Append timeline events
* Transition to COMPLETED automatically

Structure the code so polling can later be replaced with:

* React Query
* WebSocket
* Server-Sent Events

---

# Responsive Requirements

## Desktop (>=1280px)

* Sidebar visible
* Horizontal progress tracker
* Full-width panels

## Tablet (768-1279px)

* Sidebar collapsible
* Progress tracker compressed
* Panels stacked vertically

## Mobile (<768px)

* Sidebar drawer
* Vertical progress tracker
* Timeline stacked
* Buttons full width

---

# Styling Rules

Use Tailwind CSS only.

Requirements:

* Rounded cards
* Subtle borders
* Clean enterprise dashboard appearance
* Minimal visual decoration
* Clear distinction between completed, active, and pending stages

Do not introduce custom themes or redesign the approved layout.

---

# Accessibility

Ensure:

* Progress tracker keyboard accessible
* Timeline screen-reader friendly
* Live region for stage updates
* Proper heading hierarchy
* Buttons with aria-label
* Status changes announced

---

# Code Quality

* Use TypeScript interfaces
* Keep components modular
* Separate mock data from UI
* Avoid deeply nested JSX
* Memoize progress components where appropriate
* Use functional React components

---

# Expected Folder Structure

```text
src/
 ├── components/
 │    ├── layout/
 │    ├── processing/
 │    └── ui/
 ├── pages/
 │    └── DocumentProcessingStatusPage.tsx
 ├── data/
 │    └── processingMockData.ts
 ├── hooks/
 │    └── useProcessingStatus.ts
 └── routes/
```

---

# Final Requirement

Generate **production-ready React + TypeScript + Tailwind code** that matches the approved **Document Processing Status** wireframe and specification exactly.

Do **not** redesign the page.

Do **not** omit any section.

Do **not** replace the specified layout with your own interpretation.

Implement the page faithfully according to the RegTrace documentation.
