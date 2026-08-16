# Dashboard Wireframe

**Project:** RegTrace
**Page:** Dashboard
**Version:** 1.0
**Status:** Approved Low-Fidelity Wireframe

---

# Purpose

The Dashboard is the landing page for compliance officers after login. It provides an immediate overview of organizational compliance health, active regulatory processing, pending reviews, and high-priority operational actions.

The page should allow a user to understand the current compliance situation within a few seconds.

---

# Layout Overview

```text
+--------------------------------------------------------------+
| Top Navigation                                                |
+-------------+------------------------------------------------+
|             |                                                |
| Sidebar     | Dashboard Header                              |
|             |                                                |
|             | KPI Cards (4)                                 |
|             |                                                |
|             | Compliance Overview Chart                     |
|             |                                                |
|             | Recent Documents | Pending Reviews            |
|             |                                                |
|             | Today's Priority Actions                      |
|             |                                                |
+-------------+------------------------------------------------+
```

---

# Top Navigation

Contains:

* Reg2Action logo
* Global search bar
* Notification icon
* User profile/avatar

---

# Sidebar Navigation

Vertical navigation menu on the left.

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

The Dashboard item is highlighted as the active page.

---

# Dashboard Header

Left:

* Title: **Compliance Dashboard**

Right:

* Primary action button:

  * **Upload New Document**

---

# KPI Cards

Display four summary cards in a single responsive row.

## Card 1

**Title:** Total Obligations

* Large number
* Helper text

---

## Card 2

**Title:** Compliant

* Large number
* Helper text

---

## Card 3

**Title:** Pending Tasks

* Large number
* Helper text

---

## Card 4

**Title:** Critical Gaps

* Large number
* Helper text

---

# Compliance Overview

Large chart container spanning the content width.

Section title:

**Compliance Overview**

Placeholder chart representing compliance trend over time.

---

# Information Grid

Two-column layout.

## Left Panel

**Recent Regulatory Documents**

Display recent documents and their processing status.

Example statuses:

* Processing
* Obligations Extracted
* Under Review
* Tasks Generated

---

## Right Panel

**Pending Approvals / Reviews**

Display operational review items.

Examples:

* Obligations requiring human review
* Tasks awaiting assignment
* Evidence pending validation
* Audit reports awaiting sign-off

---

# Today's Priority Actions

Full-width section at the bottom.

Section title:

**Today's Priority Actions**

Display a vertical list of action items.

Each row contains:

* Action description
* Status badge or action button

Example actions:

* Review low-confidence obligations
* Complete evidence submission
* Resolve cybersecurity documentation gap
* Generate audit report

---

# Responsive Behavior

## Desktop

* Sidebar visible
* Four KPI cards in one row
* Two-column information grid

## Tablet

* Sidebar collapsible
* KPI cards become two columns
* Information grid stacks vertically

## Mobile

* Sidebar becomes drawer menu
* KPI cards stack vertically
* All sections become single-column

---

# Navigation Flow

Dashboard connects directly to:

* Document Upload
* Document Processing Status
* Obligation Review
* Task Management
* Evidence Submission
* Compliance Evaluation
* Gap Analysis
* Audit Reports
* AI Query

---

# Notes

* This wireframe defines structure only.
* No colors, typography, spacing system, or visual styling decisions are included.
* Implementation must preserve section order and layout hierarchy exactly as documented above.
