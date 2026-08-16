# Document Upload AI Implementation Prompt

**Project:** RegTrace
**Page:** Document Upload
**Target:** AI Coding Agent (Cursor / Claude Code / Windsurf / GitHub Copilot / OpenAI Codex)
**Version:** 1.0

---

# Objective

Implement the **RegTrace Document Upload page** exactly according to the approved wireframe and implementation specification.

This is a **frontend implementation task**, not a UI redesign task.

Do **not** redesign, simplify, or reinterpret the layout. Preserve the section order, hierarchy, spacing, responsive behavior, and component structure defined in `document-upload-wireframe.md` and `document-upload-spec.md`.

---

# Technology Stack

Use:

* React
* Vite
* TypeScript
* Tailwind CSS
* React Router DOM
* React Hook Form
* Zod
* React Dropzone
* Lucide React

Assume the application already includes:

* Fixed top navigation
* Fixed left sidebar
* Shared `AppLayout` component
* Existing routing infrastructure

---

# Page Route

Create the page at:

`/documents/upload`

---

# Layout Requirements

Implement this structure exactly.

```text
Top Navigation (fixed)

Sidebar (fixed)

Main Content
 ├── Upload Header
 ├── Upload Area (Drag & Drop)
 ├── Selected File Panel
 ├── Document Metadata Form
 ├── Validation & Processing Notes
 ├── Processing Flow Preview
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

## Upload Page

* DocumentUploadPage
* UploadHeader
* UploadDropzone
* SelectedFileCard
* MetadataForm
* ValidationPanel
* ProcessingFlow
* UploadActionBar

Keep components modular and reusable.

---

# Upload Header

Display:

**Title**

Upload Regulatory Document

**Description**

Explain that uploaded regulatory documents will be parsed, segmented into clauses, converted into obligations, reviewed, and transformed into operational compliance tasks.

---

# Upload Area

Implement a large drag-and-drop upload zone using **React Dropzone**.

### Features

* Drag and drop support
* Click to browse
* File picker support
* Hover state while dragging
* Single file upload

### Accepted Types

* PDF
* DOCX
* PNG
* JPG
* JPEG

### Maximum Size

25 MB

### Display

* Upload icon
* Drag & drop instruction
* Browse Files button
* Supported file type note
* Maximum size note

Do not upload automatically when a file is selected.

---

# Selected File Panel

Visible only after a file is selected.

Display:

* File name
* File size
* File type
* Upload timestamp
* Remove file button

Example:

SEBI_Master_Circular_2026.pdf

2.4 MB

PDF

Uploaded just now

Remove

---

# Metadata Form

Use **React Hook Form** with **Zod validation**.

Implement the following fields.

## Document Title

Type:

Text input

Required:

Yes

## Regulatory Source

Type:

Select

Required:

Yes

Options:

* SEBI
* RBI
* NSE
* BSE
* IRDAI
* Other

## Document Type

Type:

Select

Required:

Yes

Options:

* Master Circular
* Circular
* Notification
* Guideline
* Amendment
* Framework
* Advisory

## Intermediary Category

Type:

Multi-select

Required:

Yes

Options:

* Stock Broker
* Depository Participant
* Asset Management Company
* Registrar & Transfer Agent
* Investment Adviser
* Market Infrastructure Institution

## Publication Date

Type:

Date picker

Required:

Yes

## Effective Date

Type:

Date picker

Required:

Yes

## Language

Type:

Select

Required:

Yes

Options:

* English
* Hindi
* Other

## Reference Number

Type:

Text input

Required:

No

## Tags

Type:

Multi-value tag input

Required:

No

Example tags:

* cybersecurity
* reporting
* broker

---

# Validation Rules

Do not allow processing until:

* File selected
* All required metadata completed
* File type supported
* File size within limits

Display inline validation messages.

---

# Validation & Processing Notes

Create an informational panel showing:

**File Validation**

* PDF detected
* Text extraction available

**OCR**

* OCR will be applied for scanned documents

**Metadata**

* Required fields completion status

**Duplicate Detection**

* No similar document detected

The panel should update dynamically as form state changes.

---

# Processing Flow Preview

Display a horizontal flow indicator.

```text
Upload → Parse → Segment → Extract Obligations → Review → Generate Tasks
```

Highlight the current step:

**Upload**

This is only a preview component.

---

# Action Buttons

## Primary

**Start Processing**

Enabled only when:

* File selected
* Metadata valid

On click:

* Simulate upload
* Call placeholder upload function
* Navigate to:

`/documents/:documentId/status`

## Secondary

**Save Draft**

Action:

* Save current form state
* Stay on page

## Tertiary

**Cancel**

Action:

* Navigate back to dashboard

---

# Mock Form Data

Use:

```ts
const initialForm = {
  title: '',
  source: 'SEBI',
  documentType: 'Master Circular',
  intermediaryCategories: [],
  publicationDate: '',
  effectiveDate: '',
  language: 'English',
  referenceNumber: '',
  tags: []
};
```

---

# Mock Upload API

Create a placeholder async function.

```ts
async function uploadDocument(file, metadata) {
  return {
    documentId: 'doc_2026_001',
    status: 'UPLOADED'
  };
}
```

---

# Responsive Requirements

## Desktop (>=1280px)

* Sidebar visible
* Large upload zone
* Full-width form sections

## Tablet (768-1279px)

* Sidebar collapsible
* Upload area scales responsively
* Form fields stacked vertically

## Mobile (<768px)

* Sidebar drawer
* Upload zone full width
* All inputs stacked
* Action buttons full width

---

# Styling Rules

Use Tailwind CSS only.

Requirements:

* Rounded cards
* Subtle borders
* Consistent spacing
* Enterprise dashboard appearance
* Minimal visual decoration

Do not introduce custom themes or redesign the approved layout.

---

# Accessibility

Ensure:

* Keyboard accessible upload zone
* Proper labels for every field
* Accessible date pickers
* Drag-and-drop also operable via keyboard
* Buttons with aria-label
* Validation messages associated with inputs

---

# Code Quality

* Use TypeScript interfaces
* Keep components modular
* Separate mock data from UI
* Avoid deeply nested JSX
* Extract repeated UI patterns
* Use functional React components

---

# Expected Folder Structure

```text
src/
 ├── components/
 │    ├── layout/
 │    ├── upload/
 │    └── ui/
 ├── pages/
 │    └── DocumentUploadPage.tsx
 ├── data/
 │    └── uploadMockData.ts
 ├── hooks/
 │    └── useDocumentUpload.ts
 └── routes/
```

---

# Final Requirement

Generate **production-ready React + TypeScript + Tailwind code** that matches the approved **Document Upload** wireframe and specification exactly.

Do **not** redesign the page.

Do **not** omit any section.

Do **not** replace the specified layout with your own interpretation.

Implement the page faithfully according to the RegTrace documentation.
