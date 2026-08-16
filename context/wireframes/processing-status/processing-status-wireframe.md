# Document Processing Status Wireframe

**Project:** RegTrace
**Page:** Document Processing Status
**Version:** 1.0
**Status:** Approved Low-Fidelity Wireframe

---

# Purpose

The Document Processing Status page provides real-time visibility into the AI processing pipeline after a regulatory document is uploaded. It allows compliance officers to track progress, inspect processing stages, view extracted metadata, and understand what the system has completed before moving to obligation review.

This page should feel like a transparent workflow monitor rather than a loading screen.

---

# Layout Overview

```text
+--------------------------------------------------------------+
| Top Navigation                                                |
+-------------+------------------------------------------------+
|             |                                                |
| Sidebar     | Processing Header                              |
|             |                                                |
|             | Document Summary Card                           |
|             |                                                |
|             | Pipeline Progress Tracker                       |
|             |                                                |
|             | Current Stage Details                           |
|             |                                                |
|             | Processing Log / Timeline                       |
|             |                                                |
|             | Extracted Metadata Preview                      |
|             |                                                |
|             | Actions                                         |
|             |                                                |
+-------------+------------------------------------------------+
```

---

# Top Navigation

Contains:

* RegTrace logo
* Global search
* Notifications
* User profile

---

# Sidebar Navigation

Items:

* Dashboard
* Documents
* Obligations
* Tasks
* Evidence
* Compliance
* Gap Analysis
* Audit Reports
* AI Query
* Settings

The **Documents** section is highlighted.

---

# Processing Header

Left:

* Title: **Document Processing**

Below title:

* Processing status subtitle

Examples:

* Processing regulatory document
* AI pipeline in progress
* Preparing compliance obligations

Right:

* Status badge

Examples:

* Processing
* Completed
* Failed
* Awaiting Review

---

# Document Summary Card

Displays:

* Document title
* File name
* File size
* Upload timestamp
* Regulatory source
* Document type
* Intermediary category
* Publication date

---

# Pipeline Progress Tracker

Horizontal step-based progress component.

Stages:

1. Upload
2. Parse
3. Chunk
4. Embed
5. Segment Clauses
6. Extract Obligations
7. Human Review
8. Generate Tasks

Completed stages:

* Green check

Current stage:

* Blue active indicator

Pending stages:

* Gray

Display overall completion percentage.

Example:

**63% Complete**

---

# Current Stage Details

Large panel describing the active processing stage.

Example:

**Extracting Obligations**

Display:

* Stage description
* Current AI activity
* Estimated remaining time
* Documents/pages processed
* Clauses analyzed

Example metrics:

* Pages processed: 48 / 76
* Clauses segmented: 312
* Obligations extracted: 187

---

# Processing Log / Timeline

Vertical chronological log.

Each entry contains:

* Timestamp
* Stage
* Status
* Short description

Example:

10:02:15 - Upload completed

10:02:21 - Text extraction started

10:02:45 - OCR applied to scanned pages

10:03:18 - Clause segmentation completed

10:03:52 - Obligation extraction in progress

---

# Extracted Metadata Preview

Read-only preview of metadata identified during processing.

Examples:

* Document ID
* Language
* Total pages
* Chapters detected
* Sections detected
* Clauses detected
* OCR confidence
* Duplicate similarity score

---

# Actions

Primary button:

**View Extracted Obligations**

Enabled only after obligation extraction is completed.

Secondary button:

**Return to Documents**

Text link:

**Cancel Processing** (only while processing)

---

# Completion State

When processing finishes:

Replace the active processing message with:

**Processing Completed Successfully**

Display summary:

* Total clauses detected
* Total obligations extracted
* Tasks generated
* Human review items

The primary button becomes active.

---

# Error State

If processing fails:

Display:

* Failed stage
* Error summary
* Retry Processing button
* Download Error Log link

---

# Responsive Behavior

## Desktop

* Full application layout
* Horizontal progress tracker
* Timeline and metadata stacked

## Tablet

* Sidebar collapsible
* Progress tracker compresses
* Panels become full width

## Mobile

* Sidebar drawer
* Progress tracker becomes vertical
* Timeline stacked
* Buttons full width

---

# Navigation Flow

Previous page:

* Document Upload

Next page:

* Obligation Review Queue

---

# Notes

* This page defines structure only.
* Visual styling is intentionally omitted.
* The processing log should support live updates.
* The progress tracker should clearly distinguish completed, active, and pending stages.
* The implementation must preserve this layout hierarchy exactly.
