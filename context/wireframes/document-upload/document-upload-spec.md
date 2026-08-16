# Document Upload Implementation Specification

**Project:** RegTrace
**Page:** Document Upload
**Version:** 1.0
**Status:** Ready for Implementation

---

# Objective

Implement the **Document Upload** page exactly according to the approved wireframe.

The page must allow compliance officers to upload regulatory documents and provide metadata required for the RegTrace processing pipeline.

This page is the entry point for the AI workflow:

**Upload → Parse → Segment → Extract Obligations → Review → Generate Tasks**

---

# Technology Stack

* React
* Vite
* TypeScript
* Tailwind CSS
* React Router DOM
* React Hook Form
* Zod
* Lucide React
* React Dropzone

---

# Layout

The page uses the standard application shell.

```text
+--------------------------------------------------------------+
| Top Navigation (Fixed)                                       |
+-------------+------------------------------------------------+
|             |                                                |
| Sidebar     | Upload Header                                 |
| (Fixed)     |                                                |
|             | Upload Area (Drag & Drop)                      |
|             |                                                |
|             | Selected File Panel                            |
|             |                                                |
|             | Document Metadata Form                         |
|             |                                                |
|             | Validation & Processing Notes                  |
|             |                                                |
|             | Processing Flow Preview                        |
|             |                                                |
|             | Action Buttons                                 |
|             |                                                |
+-------------+------------------------------------------------+
```

Only the content area scrolls.

---

# Upload Header

## Title

**Upload Regulatory Document**

## Description

Explain that uploaded documents will be parsed, segmented into clauses, converted into obligations, reviewed, and transformed into operational compliance tasks.

---

# Upload Area

Implement a large drag-and-drop zone.

## Features

* Drag and drop files
* Click to browse
* File picker support
* Highlight on drag hover

## Supported Types

* PDF
* DOCX
* Image files (PNG, JPG, JPEG)

## Maximum Size

25 MB

## Visual Elements

* Upload icon
* Drag-and-drop instruction
* Browse Files button
* Supported file type note

---

# Selected File Panel

Visible only when a file is selected.

Display:

* File name
* File size
* File type
* Upload timestamp
* Remove file button

Example:

* SEBI_Master_Circular_2026.pdf
* 2.4 MB
* PDF
* Uploaded just now
* Remove

---

# Metadata Form

Use **React Hook Form + Zod** validation.

## Document Title

Type: Text input

Required: Yes

## Regulatory Source

Type: Select

Required: Yes

Options:

* SEBI
* RBI
* NSE
* BSE
* IRDAI
* Other

## Document Type

Type: Select

Required: Yes

Options:

* Master Circular
* Circular
* Notification
* Guideline
* Amendment
* Framework
* Advisory

## Intermediary Category

Type: Multi-select

Required: Yes

Options:

* Stock Broker
* Depository Participant
* Asset Management Company
* Registrar & Transfer Agent
* Investment Adviser
* Market Infrastructure Institution

## Publication Date

Type: Date picker

Required: Yes

## Effective Date

Type: Date picker

Required: Yes

## Language

Type: Select

Required: Yes

Options:

* English
* Hindi
* Other

## Reference Number

Type: Text input

Required: No

## Tags

Type: Tag input

Required: No

Allow multiple tags.

Example tags:

* cybersecurity
* reporting
* broker

---

# Validation Rules

The page must prevent processing until:

* A file is selected
* All required metadata fields are completed
* File type is supported
* File size is within limits

Display inline validation messages.

---

# Validation & Processing Notes

Display informational messages.

Examples:

**File Validation**

* PDF detected
* Text extraction available

**OCR**

* OCR will be applied for scanned pages

**Metadata**

* 6 of 6 required fields completed

**Duplicate Detection**

* No similar document detected

This panel is informational and updates dynamically.

---

# Processing Flow Preview

Display a horizontal step indicator.

```text
Upload → Parse → Segment → Extract Obligations → Review → Generate Tasks
```

Highlight the current step:

**Upload**

This is only a preview, not a live progress tracker.

---

# Action Buttons

## Primary

**Start Processing**

Enabled only when:

* File selected
* Metadata valid

Action:

* Submit upload request
* Navigate to Processing Status page

## Secondary

**Save Draft**

Action:

* Save metadata locally/server
* Remain on page

## Tertiary

**Cancel**

Action:

* Return to previous page

---

# Form State

Example interface:

```ts
interface DocumentUploadForm {
  title: string;
  source: 'SEBI' | 'RBI' | 'NSE' | 'BSE' | 'IRDAI' | 'Other';
  documentType:
    | 'Master Circular'
    | 'Circular'
    | 'Notification'
    | 'Guideline'
    | 'Amendment'
    | 'Framework'
    | 'Advisory';
  intermediaryCategories: string[];
  publicationDate: string;
  effectiveDate: string;
  language: string;
  referenceNumber?: string;
  tags: string[];
}
```

---

# Mock API Contract

POST

`/api/v1/documents/upload`

Payload:

* file
* metadata

Response:

```json
{
  "documentId": "doc_2026_001",
  "status": "UPLOADED",
  "next": "/documents/doc_2026_001/status"
}
```

---

# Responsive Behavior

## Desktop

* Sidebar visible
* Upload zone large
* Form displayed below upload area

## Tablet

* Sidebar collapsible
* Upload zone scales responsively
* Form fields become single-column

## Mobile

* Sidebar drawer
* Upload area full width
* Form fields stacked vertically
* Action buttons full width

---

# Accessibility

Requirements:

* Keyboard accessible upload zone
* Proper labels for all fields
* Date pickers accessible
* Drag-and-drop also operable via keyboard
* Buttons with aria-label
* Error messages associated with inputs

---

# Performance Requirements

* Validate before upload
* Do not upload automatically on file selection
* Lazy load large file utilities if needed
* Avoid re-rendering entire form on every field change

---

# Acceptance Criteria

Implementation is accepted only if:

* Layout matches the approved wireframe
* Drag-and-drop works
* File picker works
* Required metadata validation works
* Selected file panel updates correctly
* Processing flow preview is displayed
* Start Processing remains disabled until valid
* Responsive behavior matches specification
* No redesign is introduced

---

# Deliverables

* DocumentUploadPage
* UploadDropzone component
* SelectedFileCard component
* MetadataForm component
* ValidationPanel component
* ProcessingFlow component
* Upload action handling
* Routing integration
