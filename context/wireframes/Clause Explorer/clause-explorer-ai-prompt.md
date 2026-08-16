# Clause Explorer AI Implementation Prompt

**Project:** RegTrace
**Page:** Clause Explorer / Document Detail
**Target:** AI Coding Agent (Cursor / Claude Code / Windsurf / GitHub Copilot / OpenAI Codex)
**Version:** 1.0

## Objective

Implement the **RegTrace Clause Explorer page** exactly according to the approved wireframe and implementation specification.

This is a **frontend implementation task**, not a UI redesign task.

Do **not** redesign, simplify, or reinterpret the layout. Preserve the section order, hierarchy, responsive behavior, and component structure defined in `clause-explorer-wireframe.md` and `clause-explorer-spec.md`.

This page visualizes the output of the **Clause Segmentation Agent** and must preserve the legal hierarchy exactly.

## Technology Stack

Use:

* React
* Vite
* TypeScript
* Tailwind CSS
* React Router DOM
* Lucide React

Assume the application already includes:

* Fixed top navigation
* Fixed left sidebar
* Shared `AppLayout` component
* Existing routing infrastructure

## Page Route

Create the page at:

`/documents/:documentId/clauses`

## Layout Requirements

Implement this structure exactly.

```text
Top Navigation (fixed)

Sidebar (fixed)

Main Content
 ├── Document Header
 ├── Statistics Row
 ├── Two Panel Layout
 │    ├── Clause Tree
 │    └── Clause Content Viewer
 ├── Clause Metadata
 ├── Related Obligations Preview
 └── Navigation Actions
```

The **Clause Tree panel and Content Viewer panel must scroll independently**.

## Components to Create

Create reusable components.

### Layout

* AppLayout
* TopNavbar
* Sidebar

### Clause Explorer

* ClauseExplorerPage
* DocumentHeader
* DocumentStatsRow
* ClauseTree
* ClauseContentViewer
* ClauseMetadata
* RelatedObligationsPreview
* SearchFilterBar
* NavigationActionBar

Keep components modular and reusable.

## Document Header

Display:

* Document title
* Regulatory source
* Document type
* Intermediary category
* Processing status
* Last processed timestamp

Right-side actions:

* Export Structured Document
* Open Original Document

Use mock data.

## Statistics Row

Display six statistic cards.

Mock values:

* Pages: 76
* Chapters: 12
* Sections: 48
* Clauses: 312
* Sub-clauses: 91
* Obligations: 187

Render in a responsive grid.

## Clause Tree

Left panel width: **280px**

Render a hierarchical expandable tree.

Example structure:

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

Requirements:

* Expand/collapse
* Search support
* Highlight selected clause
* Independent scrolling
* Preserve legal hierarchy

Selecting a clause updates the right panel.

## Search and Filters

Place above the clause tree.

Search placeholder:

Search clauses, keywords, obligation references...

Filters:

* Chapter
* Section
* Has Obligations
* Low Confidence
* OCR Applied

Use local state for filtering.

## Clause Content Viewer

Display the selected clause.

Show:

* Clause number
* Clause title
* Full legal text
* Original formatting
* Numbered lists
* Bullet lists
* Sub-clause indentation

Do **not** summarize the clause.

Example:

**Clause 2.1.3**

**Client Fund Segregation**

Display the original regulatory text exactly.

## Clause Metadata

Render a metadata card.

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

Use mock values.

## Related Obligations Preview

Render obligation cards for the selected clause.

Each card contains:

* Obligation summary
* Obligation type
* Responsible role
* Trigger
* Confidence score

Example:

Maintain client funds separately from proprietary funds.

Type: Operational

Role: Compliance Officer

Trigger: Ongoing

Confidence: 0.94

Actions:

* View Full Obligation
* Open in Review Queue

## Navigation Actions

Bottom action bar.

Buttons:

* Previous Clause
* Next Clause
* View Extracted Obligations
* Open Human Review

Routes:

`/documents/:id/obligations`

`/review`

## Mock Data

Create local mock data.

Example interface:

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

Populate at least:

* 2 chapters
* 3 sections
* 6 clauses
* 3 related obligations

## Responsive Requirements

### Desktop

* Two-panel layout
* Tree always visible
* Independent scrolling

### Tablet

* Tree collapsible
* Content prioritized

### Mobile

* Tree becomes drawer
* Content full width
* Bottom navigation sticky

## Styling Rules

Use Tailwind CSS only.

Requirements:

* Rounded cards
* Subtle borders
* Enterprise dashboard appearance
* Minimal visual decoration
* Clear visual hierarchy

Do **not** redesign the approved layout.

## Accessibility

Ensure:

* Keyboard navigable tree
* ARIA tree roles
* Focus indicators
* Proper heading hierarchy
* Accessible buttons

## Code Quality

* Use TypeScript interfaces
* Keep components modular
* Separate mock data from UI
* Avoid deeply nested JSX
* Use functional React components

## Expected Folder Structure

```text
src/
 ├── components/
 │    ├── layout/
 │    ├── clause/
 │    └── ui/
 ├── pages/
 │    └── ClauseExplorerPage.tsx
 ├── data/
 │    └── clauseMockData.ts
 ├── hooks/
 │    └── useClauseExplorer.ts
 └── routes/
```

## Final Requirement

Generate **production-ready React + TypeScript + Tailwind code** that matches the approved **Clause Explorer** wireframe and specification exactly.

Do **not** redesign the page.

Do **not** omit any section.

Do **not** replace the specified layout with your own interpretation.

Implement the page faithfully according to the RegTrace documentation.
