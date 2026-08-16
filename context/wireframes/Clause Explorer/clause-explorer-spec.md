# Clause Explorer Implementation Specification

**Project:** RegTrace
**Page:** Clause Explorer / Document Detail
**Version:** 1.0
**Status:** Ready for Implementation

## Objective

Implement the Clause Explorer page that displays the structured legal hierarchy produced by the Clause Segmentation Agent. The page must preserve the original regulatory structure and allow users to navigate clauses, inspect metadata, and preview related obligations.

## Technology Stack

* React
* Vite
* TypeScript
* Tailwind CSS
* React Router DOM
* Lucide React

## Layout

Top Navigation (fixed)

Sidebar (fixed)

Main Content:

* Document Header
* Statistics Row
* Two-panel layout

  * Left: Clause Tree
  * Right: Clause Viewer
* Clause Metadata
* Related Obligations
* Navigation Actions

The left panel and right panel scroll independently.

## Document Header

Display:

* Document title
* Regulatory source
* Document type
* Intermediary category
* Processing status
* Last processed timestamp

Actions:

* Export Structured Document
* Open Original Document

## Statistics Row

Display:

* Total Pages
* Chapters
* Sections
* Clauses
* Sub-clauses
* Extracted Obligations

## Clause Tree

Left panel width: 280px.

Support:

* Expand/collapse chapters
* Expand/collapse sections
* Highlight selected clause
* Search
* Independent scrolling

Example hierarchy:

Chapter 1

* Section 1.1

  * Clause 1.1.1
  * Clause 1.1.2
* Section 1.2

Chapter 2

* Section 2.1

  * Clause 2.1.1
  * Clause 2.1.2

Selecting a clause updates the content viewer.

## Search and Filters

Search placeholder:

Search clauses, keywords, obligation references...

Filters:

* Chapter
* Section
* Has Obligations
* Low Confidence
* OCR Applied

## Clause Content Viewer

Display:

* Clause number
* Clause title
* Full legal text
* Original formatting
* Lists
* Numbering
* Sub-clause indentation

No summarization is allowed on this page.

## Clause Metadata

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

## Related Obligations Preview

For the selected clause, show obligation cards with:

* Obligation summary
* Obligation type
* Responsible role
* Trigger
* Confidence score

Actions:

* View Full Obligation
* Open in Review Queue

## Navigation Actions

Buttons:

* Previous Clause
* Next Clause
* View Extracted Obligations
* Open Human Review

## Data Model

```ts
interface ClauseNode {
  id: string;
  chapter: string;
  section: string;
  clauseNumber: string;
  title: string;
  text: string;
  pageNumber: number;
  extractionConfidence: number;
  ocrConfidence: number;
  children?: ClauseNode[];
}
```

## API

GET `/api/v1/documents/:id/clauses`

Returns the full hierarchical clause structure.

## Responsive Behavior

Desktop:

* Two-panel layout
* Tree always visible

Tablet:

* Tree collapsible
* Content prioritized

Mobile:

* Tree becomes drawer
* Content full width
* Bottom navigation sticky

## Accessibility

* Keyboard navigable tree
* ARIA tree roles
* Focus indicators
* Proper heading hierarchy

## Acceptance Criteria

* Legal hierarchy preserved
* Tree navigation functional
* Clause selection updates content
* Metadata displayed correctly
* Related obligations preview works
* Responsive behavior implemented
* No redesign introduced

## Deliverables

* ClauseExplorerPage
* ClauseTree
* ClauseContentViewer
* ClauseMetadata
* RelatedObligationsPreview
* SearchFilterBar
* NavigationActionBar
* Routing integration
