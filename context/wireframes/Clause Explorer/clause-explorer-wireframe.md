# Clause Explorer Wireframe

**Project:** RegTrace
**Page:** Clause Explorer / Document Detail
**Version:** 1.0
**Status:** Approved Low-Fidelity Wireframe

---

# Purpose

The Clause Explorer page allows compliance officers to inspect the structured version of a processed regulatory document. It presents the legal hierarchy (Chapter → Section → Clause → Sub-clause), enables navigation through the document, and provides contextual information before obligation review begins.

This page acts as the bridge between document processing and obligation extraction.

---

# Layout Overview

```text
+--------------------------------------------------------------+
| Top Navigation                                                |
+-------------+------------------------------------------------+
|             |                                                |
| Sidebar     | Document Header                                |
|             |                                                |
|             | Document Statistics                            |
|             |                                                |
| Clause Tree | Clause Content Viewer                          |
| Navigation  |                                                |
|             | Clause Metadata                                |
|             |                                                |
|             | Related Obligations Preview                    |
|             |                                                |
|             | Navigation Actions                             |
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

# Document Header

Displays:

* Document title
* Regulatory source
* Document type
* Intermediary category
* Processing status
* Last processed timestamp

Right side:

* Export button
* Open original document button

---

# Document Statistics

Horizontal summary cards.

Display:

* Total Pages
* Chapters
* Sections
* Clauses
* Sub-clauses
* Extracted Obligations

Example:

* Pages: 76
* Chapters: 12
* Sections: 48
* Clauses: 312
* Sub-clauses: 91
* Obligations: 187

---

# Clause Tree Navigation

Left panel.

Hierarchical expandable tree.

Example:

```text
Chapter 1
  ├── Section 1.1
  │     ├── Clause 1.1.1
  │     └── Clause 1.1.2
  └── Section 1.2

Chapter 2
  └── Section 2.1
        ├── Clause 2.1.1
        └── Clause 2.1.2
```

Features:

* Expand / collapse
* Search within clauses
* Highlight selected clause
* Independent scrolling
* Preserve legal hierarchy

---

# Clause Content Viewer

Right panel.

Displays the selected clause.

Show:

* Clause number
* Clause title
* Full legal text
* Preserved formatting
* Lists
* Numbering
* Sub-clause indentation

Example:

**Clause 2.1.3**

**Client Fund Segregation**

Full clause text appears here exactly as extracted from the regulatory document.

---

# Clause Metadata

Panel below clause content.

Display:

* Chapter
* Section
* Clause number
* Page number
* Word count
* Character count
* Extraction confidence
* OCR confidence
* Processing timestamp

Example:

* Chapter: 2
* Section: 2.1
* Clause: 2.1.3
* Page: 18
* Words: 146
* Characters: 982
* Extraction Confidence: 0.98
* OCR Confidence: 0.97
* Processed: 10:03 AM

---

# Related Obligations Preview

Displays obligations extracted from the currently selected clause.

Each obligation card shows:

* Obligation summary
* Obligation type
* Responsible role
* Due trigger
* Confidence score

Example:

**Maintain client funds separately from proprietary funds.**

Type:

Operational

Role:

Compliance Officer

Confidence:

0.94

Include a **View Full Obligation** action.

---

# Navigation Actions

Bottom action bar.

Buttons:

* Previous Clause
* Next Clause
* View Extracted Obligations
* Open Human Review

---

# Search & Filter

Above the clause tree.

Search input:

Search clauses, keywords, obligation references...

Filters:

* Chapter
* Section
* Has Obligations
* Low Confidence
* OCR Applied

---

# Responsive Behavior

## Desktop

* Two-panel layout
* Independent scrolling panels
* Tree navigation always visible

## Tablet

* Tree panel collapsible
* Content becomes dominant
* Metadata stacks below content

## Mobile

* Tree becomes drawer
* Content full width
* Bottom navigation sticky
* Statistics become horizontal scroll cards

---

# Navigation Flow

Previous page:

* Document Processing Status

Next pages:

* Obligation Review Queue
* Human Review
* Task Generation

---

# Notes

* This wireframe defines structure only.
* Visual styling is intentionally omitted.
* The legal hierarchy must remain preserved exactly as produced by the Clause Segmentation Agent.
* The content viewer should display the original clause text without summarization.
* The implementation must preserve this layout hierarchy exactly.
