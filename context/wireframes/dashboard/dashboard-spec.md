# Dashboard Implementation Specification

**Project:** RegTrace
**Page:** Dashboard
**Version:** 1.0
**Status:** Ready for Implementation

---

# Objective

Implement the RegTrace Dashboard page exactly according to the approved wireframe. The goal is to create a production-ready dashboard for compliance officers that provides visibility into regulatory obligations, operational tasks, document processing, and compliance health.

This document defines layout, component structure, responsive behavior, data contracts, and implementation constraints.

---

# Technology Stack

* React
* Vite
* TypeScript
* Tailwind CSS
* React Router DOM
* Recharts
* Lucide React Icons

---

# Global Layout

The dashboard uses the application shell layout.

```text
+------------------------------------------------------+
| Top Navigation (Fixed)                               |
+-------------+----------------------------------------+
| Sidebar      | Main Content                          |
| (Fixed)      | (Scrollable)                          |
+-------------+----------------------------------------+
```

---

# Top Navigation

**Height:** 64px

## Left

* Application logo
* Product name: RegTrace

## Center

* Global search input
* Placeholder:

  * Search obligations, documents, tasks...

## Right

* Notification button
* User avatar
* Profile dropdown trigger

## Behavior

* Fixed at top
* Stays visible during scrolling

---

# Sidebar

**Width:** 240px

## Navigation Items

1. Dashboard
2. Documents
3. Obligations
4. Tasks
5. Evidence
6. Compliance
7. Gap Analysis
8. Audit Reports
9. AI Query
10. Settings

## Active State

* Dashboard highlighted
* Active indicator visible

## Behavior

Desktop:

* Always visible

Tablet:

* Collapsible

Mobile:

* Drawer navigation

---

# Main Content

**Padding:** 24px

**Scrolling:** Vertical only

---

# Header Section

## Left

**Title**

Compliance Dashboard

## Right

Primary button:

Upload New Document

### Button Behavior

* Opens Document Upload page
* Primary filled button
* Icon optional

---

# KPI Cards

Display four cards in a responsive grid.

## Layout

Desktop:

4 columns

Tablet:

2 columns

Mobile:

1 column

## Card Structure

Each card contains:

* Label
* Large numeric value
* Helper description

### Card 1

Title:

Total Obligations

Value:

1248

Description:

Across all active regulations

### Card 2

Title:

Compliant

Value:

1102

Description:

88.3% of obligations

### Card 3

Title:

Pending Tasks

Value:

46

Description:

Awaiting completion

### Card 4

Title:

Critical Gaps

Value:

7

Description:

Requires immediate action

---

# Compliance Overview

## Section Title

Compliance Overview

## Chart

Type:

Line chart

Library:

Recharts

Height:

300px

Width:

100%

## Data

Mock monthly compliance trend.

Example:

Jan

82%

Feb

84%

Mar

86%

Apr

87%

May

88%

Jun

89%

---

# Information Grid

Two-column responsive layout.

Desktop:

2 columns

Tablet/Mobile:

Stack vertically

---

# Recent Regulatory Documents Panel

## Title

Recent Regulatory Documents

## Items

Each item contains:

* Document name
* Processing status
* Optional timestamp

### Mock Data

SEBI Master Circular 2026

Status:

Processing

Cybersecurity Guidelines Update

Status:

Obligations Extracted

Investment Adviser Amendment

Status:

Under Review

Broker Compliance Circular

Status:

Tasks Generated

---

# Pending Reviews Panel

## Title

Pending Approvals / Reviews

## Items

12 obligations require human review

5 tasks awaiting assignment

3 evidence submissions pending validation

2 audit reports awaiting sign-off

Each row contains:

* Description
* Count badge

---

# Today’s Priority Actions

## Title

Today’s Priority Actions

Display as a vertical list.

Each row contains:

* Action description
* Priority badge
* Open button

## Mock Actions

Review obligations with confidence below 0.80

Priority:

High

Complete evidence submission for quarterly reporting

Priority:

Medium

Resolve cybersecurity documentation gap

Priority:

Critical

Generate audit report for August compliance cycle

Priority:

Medium

---

# Component Architecture

The page should be composed of reusable components.

```text
DashboardPage
 ├── AppLayout
 │    ├── TopNavbar
 │    ├── Sidebar
 │    └── MainContent
 │         ├── PageHeader
 │         ├── KPIGrid
 │         │    └── KPIStatCard
 │         ├── ComplianceChartCard
 │         ├── InfoGrid
 │         │    ├── RecentDocumentsCard
 │         │    └── PendingReviewsCard
 │         └── PriorityActionsCard
```

---

# Routing

Route:

/dashboard

Navigation Links:

/documents

/obligations

/tasks

/evidence

/compliance

/gap-analysis

/reports

/ai-query

/settings

---

# State Management

Initial implementation:

Local mock data

Future integration:

React Query

REST API

WebSocket updates

---

# Accessibility

Requirements:

* Keyboard navigable sidebar
* Focus indicators visible
* Proper heading hierarchy
* Buttons with aria-label
* Search input labeled
* Contrast compliant

---

# Performance Requirements

* Lazy load chart library
* Memoize KPI cards where appropriate
* Avoid unnecessary re-renders
* Responsive layout without layout shift

---

# Acceptance Criteria

The implementation is accepted only if:

* Layout matches approved wireframe exactly
* Section order is preserved
* Responsive behavior matches specification
* Sidebar and navbar remain fixed
* Dashboard content scrolls independently
* Components are reusable
* Mock data renders correctly
* No visual redesign is introduced

---

# Deliverables

* Dashboard page
* Reusable layout components
* KPI components
* Chart component
* Recent documents panel
* Pending reviews panel
* Priority actions panel
* Routing integration
* Responsive implementation
