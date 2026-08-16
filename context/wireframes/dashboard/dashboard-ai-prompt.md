# Dashboard AI Implementation Prompt

**Project:** RegTrace
**Page:** Dashboard
**Target:** AI Coding Agent (Cursor / Claude Code / Windsurf / GitHub Copilot / OpenAI Codex)
**Version:** 1.0

---

# Objective

Implement the **RegTrace Dashboard page** exactly according to the approved wireframe and implementation specification.

This is a **frontend implementation task**, not a design task.

Do **not** redesign, simplify, or reinterpret the layout. Follow the structure, hierarchy, spacing, and responsive behavior defined in `dashboard-wireframe.md` and `dashboard-spec.md`.

---

# Technology Stack

Use:

* React
* Vite
* TypeScript
* Tailwind CSS
* React Router DOM
* Recharts
* Lucide React

Assume the project already uses a shared `AppLayout` with a fixed navbar and fixed sidebar.

---

# Page Route

Create the page at:

`/dashboard`

---

# Layout Requirements

Implement this structure:

```text
Top Navigation (fixed)

Sidebar (fixed)

Main Content
 ├── Page Header
 ├── KPI Cards
 ├── Compliance Overview Chart
 ├── Recent Documents
 ├── Pending Reviews
 └── Today’s Priority Actions
```

The sidebar and navbar must remain visible while only the content area scrolls.

---

# Components to Create

Create reusable components.

## Layout

* AppLayout
* TopNavbar
* Sidebar

## Dashboard

* DashboardPage
* PageHeader
* KPIStatCard
* KPIGrid
* ComplianceChartCard
* RecentDocumentsCard
* PendingReviewsCard
* PriorityActionsCard
* StatusBadge

Each component should be placed in a reusable component folder structure.

---

# Navbar

Height: **64px**

Include:

* RegTrace logo/text
* Global search input
* Notification icon
* User avatar/profile button

The navbar must be fixed at the top.

---

# Sidebar

Width: **240px**

Include navigation items:

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

The **Dashboard** item must appear active.

Desktop:

* Always visible

Tablet:

* Collapsible

Mobile:

* Drawer navigation

---

# Dashboard Header

Left:

**Compliance Dashboard**

Right:

Primary button:

**Upload New Document**

Button should route to the document upload page placeholder.

---

# KPI Cards

Display **4 responsive cards**.

Use this data:

```ts
const kpis = [
  {
    title: 'Total Obligations',
    value: 1248,
    description: 'Across all active regulations'
  },
  {
    title: 'Compliant',
    value: 1102,
    description: '88.3% of obligations'
  },
  {
    title: 'Pending Tasks',
    value: 46,
    description: 'Awaiting completion'
  },
  {
    title: 'Critical Gaps',
    value: 7,
    description: 'Requires immediate action'
  }
];
```

Grid behavior:

Desktop:

* 4 columns

Tablet:

* 2 columns

Mobile:

* 1 column

---

# Compliance Overview Chart

Create a **line chart** using **Recharts**.

Height:

**300px**

Use mock monthly data:

```ts
[
  { month: 'Jan', compliance: 82 },
  { month: 'Feb', compliance: 84 },
  { month: 'Mar', compliance: 86 },
  { month: 'Apr', compliance: 87 },
  { month: 'May', compliance: 88 },
  { month: 'Jun', compliance: 89 }
]
```

Title:

**Compliance Overview**

---

# Recent Documents Card

Title:

**Recent Regulatory Documents**

Use mock data:

```ts
[
  {
    name: 'SEBI Master Circular 2026',
    status: 'Processing'
  },
  {
    name: 'Cybersecurity Guidelines Update',
    status: 'Obligations Extracted'
  },
  {
    name: 'Investment Adviser Amendment',
    status: 'Under Review'
  },
  {
    name: 'Broker Compliance Circular',
    status: 'Tasks Generated'
  }
]
```

Render each item with:

* Document name
* Status badge

---

# Pending Reviews Card

Title:

**Pending Approvals / Reviews**

Render:

* 12 obligations require human review
* 5 tasks awaiting assignment
* 3 evidence submissions pending validation
* 2 audit reports awaiting sign-off

Display count badges aligned to the right.

---

# Today’s Priority Actions

Title:

**Today’s Priority Actions**

Render:

* Review obligations with confidence below 0.80
* Complete evidence submission for quarterly reporting
* Resolve cybersecurity documentation gap
* Generate audit report for August compliance cycle

Each row should contain:

* Action description
* Priority badge
* Open button

---

# Responsive Requirements

Desktop (>=1280px)

* Sidebar visible
* KPI cards in one row
* Two-column information grid

Tablet (768-1279px)

* Sidebar collapsible
* KPI cards in two columns
* Information grid stacked

Mobile (<768px)

* Sidebar drawer
* KPI cards stacked
* All content full width

---

# Styling Rules

* Use Tailwind CSS only
* Use consistent spacing scale
* Use rounded cards
* Use subtle borders
* Do not introduce decorative graphics
* Keep design clean and enterprise-focused
* Preserve the hierarchy from the approved wireframe

---

# Accessibility

Ensure:

* Keyboard navigation
* Visible focus states
* Proper heading hierarchy
* Accessible button labels
* Search input label
* Screen-reader-friendly navigation

---

# Code Quality

* Use TypeScript interfaces
* Keep components under ~150 lines where possible
* Extract repeated UI into reusable components
* Use React functional components
* Avoid inline anonymous functions when unnecessary
* Keep mock data separated from component rendering logic

---

# Expected Folder Structure

```text
src/
 ├── components/
 │    ├── layout/
 │    ├── dashboard/
 │    └── ui/
 ├── pages/
 │    └── DashboardPage.tsx
 ├── data/
 │    └── dashboardMockData.ts
 └── routes/
```

---

# Final Requirement

Generate **production-ready React + TypeScript + Tailwind code** that matches the approved dashboard wireframe exactly.

Do **not** redesign the page.

Do **not** omit any section.

Do **not** replace the specified layout with your own interpretation.

Implement the dashboard faithfully according to the RegTrace documentation.
