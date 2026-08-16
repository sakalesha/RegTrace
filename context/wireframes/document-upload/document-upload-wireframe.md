# Document Upload Wireframe

**Project:** RegTrace
**Page:** Document Upload
**Version:** 1.0
**Status:** Approved Low-Fidelity Wireframe

---

# Purpose

The Document Upload page is the primary entry point for regulatory documents into the RegTrace platform. It allows compliance officers to upload SEBI circulars, master circulars, notifications, guidelines, or other regulatory documents along with metadata required for processing.

The page should make document submission simple, structured, and auditable.

---

# Layout Overview

```text
+--------------------------------------------------------------+
| Top Navigation                                                |
+-------------+------------------------------------------------+
|             |                                                |
| Sidebar     | Upload Header                                 |
|             |                                                |
|             | Upload Area (Drag & Drop)                      |
|             |                                                |
|             | Document Metadata Form                         |
|             |                                                |
|             | Validation / Processing Notes                  |
|             |                                                |
|             | Upload Actions                                 |
|             |                                                |
+-------------+------------------------------------------------+
```

---

# Top Navigation

Contains:

* RegTrace logo
* Global search bar
* Notification icon
* User profile/avatar

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

The **Documents** section is highlighted as active.

---

# Upload Header

Left:

* Title: **Upload Regulatory Document**

Below title:

* Short description explaining that uploaded documents will be parsed, segmented, and converted into compliance obligations.

---

# Upload Area

Large drag-and-drop upload zone.

Contains:

* Upload icon
* Drag & drop instruction
* Browse Files button
* Supported file types
* Maximum file size note

Example text:

* Drag & drop PDF, DOCX, or scanned regulatory documents
* or
* Browse Files

---

# Selected File Panel

Visible only after a file is selected.

Displays:

* File name
* File size
* File type
* Remove file option

---

# Document Metadata Form

## Document Title

Text input

## Regulatory Source

Dropdown

Examples:

* SEBI
* RBI
* NSE
* BSE
* Other

## Document Type

Dropdown

Examples:

* Master Circular
* Circular
* Notification
* Guideline
* Amendment
* Framework
* Advisory

## Intermediary Category

Multi-select

Examples:

* Stock Broker
* Depository Participant
* Asset Management Company
* Registrar & Transfer Agent
* Investment Adviser
* Market Infrastructure Institution

## Publication Date

Date picker

## Effective Date

Date picker

## Language

Dropdown

Examples:

* English
* Hindi
* Other

## Reference Number

Optional text input

## Tags

Optional multi-value input

---

# Validation & Processing Notes

Informational panel.

Displays:

* File validation status
* OCR will be applied for scanned documents
* Metadata completeness indicator
* Duplicate document warning (if applicable)

---

# Upload Actions

Primary button:

**Start Processing**

Secondary button:

**Save Draft**

Text link:

**Cancel**

---

# Processing Flow Preview

Small horizontal flow indicator.

Upload → Parse → Segment → Extract Obligations → Review → Generate Tasks

This helps users understand what happens after submission.

---

# Responsive Behavior

## Desktop

* Full two-column application layout
* Large upload zone
* Metadata form below upload area

## Tablet

* Sidebar collapsible
* Upload zone scales to container width
* Form fields become single-column

## Mobile

* Sidebar drawer
* Upload zone full width
* All form fields stacked vertically
* Action buttons full width

---

# Navigation Flow

The page is accessed from:

* Dashboard Upload button
* Documents module

After successful upload:

Navigate to:

**Document Processing Status**

---

# Notes

* This wireframe defines structure only.
* Visual styling is intentionally omitted.
* Upload area should support both drag-and-drop and file picker interaction.
* Metadata collection must occur before processing begins.
* The implementation should preserve this layout hierarchy exactly.
