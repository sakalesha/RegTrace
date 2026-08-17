# RegTrace

**RegTrace** is an open-source compliance automation platform that ingests regulatory documents (starting with the [SEBI Master Circular for Stockbrokers](https://www.sebi.gov.in/sebi_data/commondocs/SEBI2024_95670.pdf)), runs them through an AI-powered multi-agent pipeline, and turns dense legal text into structured, reviewable, and auditable obligations, tasks, and compliance reports.

- **Backend** — FastAPI + Motor (async MongoDB) + Groq LLM (`llama-3.3-70b-versatile`) + sentence-transformers embeddings
- **Frontend** — React 19 + TypeScript + Vite + Tailwind CSS 4 + React Router v7
- **AI Pipeline** — 7-agent chain: Ingestion → Parsing → Clause Segmentation → Obligation Extraction → Task Generation → Evidence Collection → Compliance/Gap/Audit reporting

> **Status:** Active development. The pipeline is wired end-to-end and backed by a gold-standard evaluation suite, but many agent heuristics are still being refined against the SEBI corpus.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [Agent Pipeline](#3-agent-pipeline)
4. [Backend API](#4-backend-api)
5. [Frontend](#5-frontend)
6. [Data Corpus](#6-data-corpus)
7. [Testing & Evaluation](#7-testing--evaluation)
8. [Development Setup](#8-development-setup)
9. [.env Configuration](#9-env-configuration)
10. [Scripts](#10-scripts)
11. [Design System](#11-design-system)
12. [Deployment](#12-deployment)
13. [Project Structure](#13-project-structure)
14. [License](#14-license)

---

## 1. Project Overview

RegTrace exists to solve a narrow but painful problem: **compliance teams at brokerage firms and financial services companies must manually read, interpret, and track obligations buried in hundreds of pages of SEBI circulars.**

Instead of PDFs and spreadsheets, RegTrace provides:

- **Document ingestion** — Upload a PDF; it is parsed, layout-analyzed, and stored in MongoDB with Cloudinary-backed media.
- **Clause segmentation** — A rule-based + LLM hybrid splits the document into a hierarchy of clauses (chapters → sections → subsections), each with a stable `section_number`, `clause_type`, and page range.
- **Obligation extraction** — An LLM agent identifies obligations from each clause, extracting fields like `actor`, `action`, `is_mandatory`, `deadline`, and `frequency`.
- **Human review** — Obligations are surfaced for human review before task generation, closing the gap between automated extraction and legal accuracy.
- **Task generation & assignment** — Obligations that survive review become assignable compliance tasks with deadlines.
- **Evidence collection & compliance evaluation** — Agents check whether tasks have supporting evidence and evaluate overall document compliance.
- **Gap analysis & audit reports** — A gap analysis identifies missing evidence or unmet obligations; audit reports aggregate everything into an exportable record.

The platform is built as a **monorepo** with a thin frontend (no auth yet) consuming a FastAPI backend that exposes the full pipeline through REST + a pipeline orchestration endpoint.

---

## 2. Architecture

### Stack Summary

| Layer              | Technology                          |
|--------------------|-------------------------------------|
| API framework      | FastAPI (`app/main.py`)             |
| Async DB driver    | Motor (MongoDB)                     |
| ORM / models       | Pydantic v2 (`app/models/`)         |
| Schemas (API I/O)  | Pydantic v2 (`app/schemas/`)        |
| LLM provider       | Groq — `llama-3.3-70b-versatile`    |
| Embeddings         | sentence-transformers `all-MiniLM-L6-v2` (384-dim) |
| Storage            | Cloudinary                          |
| Web serving        | Uvicorn / ASGI                      |
| Frontend           | React 19 + Vite + Tailwind CSS 4    |
| Deployment         | Render (backend) + Vercel (frontend) |

### Data Flow

```
PDF Upload (Cloudinary)
      ↓
IngestionAgent (extracts metadata + pages)
      ↓
ParsingAgent (pymupdf text extraction + layout analysis)
      ↓
ClauseSegmentationAgent (hierarchy-aware clause splitting)
      ↓
ObligationExtractionAgent (per-clause LLM extraction)
      ↓
HumanReview (ObligationService.review_obligation — marks obligations reviewed)
      ↓
TaskGenerationAgent (converts reviewed obligations → assignable tasks)
      ↓
TaskAssignmentAgent (assigns tasks to mock owners)
      ↓
EvidenceCollectionAgent (looks up evidence for each task)
      ↓
ComplianceService → GapService → ReportService → AuditService
```

### Services vs. Agents

| Concept        | Description |
|---------------|-------------|
| **Agents** (`app/agents/`) | LLM-driven or rule-driven processors, each owning one pipeline stage. Each inherits from `BaseAgent` which standardizes `run()`, `process()`, and pipeline logging. |
| **Services** (`app/services/`) | Higher-level orchestrators that combine multiple agents or DB operations. E.g. `ObligationService` wraps the review step; `PipelineService` runs the full chain. |
| **Jobs** (`pipeline/jobs.py`)  | Async task runner for long-running pipeline stages, with cancellation support via `job_registry`. |

### Key Design Decisions

- **No authentication yet.** The API is open; a future milestone will add JWT-based auth.
- **Lazy LLM/Embedding loading.** `GroqClient` and `SentenceTransformer` are instantiated on first use, not at import time, to reduce startup latency.
- **Pipeline idempotency.** Running the pipeline on the same document_id will re-parse and re-extract, overwriting previous results — this is intentional during the evaluation phase.

---

## 3. Agent Pipeline

The pipeline is orchestrated by `PipelineService` (in `app/services/pipeline_service.py`) and can be triggered via the `POST /api/pipeline/{document_id}` endpoint. Each stage logs its entry/exit to `pipeline_log.py`.

| Stage                  | Agent                       | Output / Side Effect |
|------------------------|-----------------------------|----------------------|
| 1. Ingestion           | `IngestionAgent`            | Document record in MongoDB + Cloudinary upload of original PDF |
| 2. Parsing             | `ParsingAgent`              | `ParsingOutput` with raw text per page |
| 3. Clause Segmentation | `ClauseSegmentationAgent`   | Clauses with `section_number`, `chapter`, `hierarchy_level`, `clause_type`, page range |
| 4. Obligation Extraction | `ObligationExtractionAgent` | Obligations per clause (actor, action, mandatory, deadline, frequency) |
| 5. Human Review        | `ObligationService.review_obligation()` | Marks obligation `reviewed: True` in DB |
| 6. Task Generation     | `TaskGenerationAgent`       | Compliance tasks derived from reviewed obligations |
| 7. Task Assignment     | `TaskAssignmentAgent`       | Assigns tasks to mock stakeholders |
| 8. Evidence Collection | `EvidenceCollectionAgent`   | Collects evidence references for each task |
| 9. Compliance Eval     | `ComplianceService`         | Computes compliance scores per document |
| 10. Gap Analysis       | `GapService`                | Identifies missing evidence, unmet obligations |
| 11. Report Generation  | `ReportService`             | Generates summary audit report |
| 12. Audit Trail        | `AuditService`              | Logs all actions for auditability |

`ClauseSegmenter` (rule-based, in `app/utils/layout.py`) runs *before* `ClauseSegmentationAgent` to pre-split the document into logical blocks, which the agent then classifies hierarchically.

---

## 4. Backend API

All routes are mounted under `/api` in `app/main.py` via `app/include_router(...)`.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/documents` | `POST` | Ingest a new document (PDF URL or upload) |
| `/api/documents` | `GET` | List all documents |
| `/api/documents/{id}` | `GET` | Get document detail |
| `/api/documents/{id}` | `DELETE` | Delete a document |
| `/api/documents/{id}/status` | `GET` | Get ingestion/parsing status |
| `/api/parsing/{document_id}` | `POST` | Trigger parsing |
| `/api/clauses` | `GET` | List all clauses |
| `/api/clauses/{document_id}` | `GET` | Get clauses for a document |
| `/api/clauses/{clause_id}` | `GET` | Get a single clause |
| `/api/clauses/{clause_id}/validate` | `POST` | Run `ClauseValidator` on a clause |
| `/api/obligations` | `GET` | List all obligations |
| `/api/obligations/{document_id}` | `GET` | Get obligations for a document |
| `/api/obligations/{obligation_id}` | `GET` | Get a single obligation |
| `/api/obligations/{obligation_id}/review` | `POST` | Mark obligation as reviewed |
| `/api/tasks` | `GET` | List all tasks |
| `/api/tasks/{document_id}` | `GET` | Get tasks for a document |
| `/api/tasks/{task_id}` | `GET` | Get a single task |
| `/api/tasks/{task_id}/assign` | `POST` | Assign a task to a user |
| `/api/evidence` | `GET` | List all evidence records |
| `/api/evidence/{task_id}` | `GET` | Get evidence for a task |
| `/api/evidence/upload` | `POST` | Upload supporting evidence for a task |
| `/api/compliance/{document_id}` | `GET` | Get compliance evaluation for a document |
| `/api/gap/{document_id}` | `GET` | Get gap analysis for a document |
| `/api/reports/{document_id}` | `GET` | Get generated audit report |
| `/api/reports/{document_id}/pdf` | `POST` | Generate and download a PDF report |
| `/api/search` | `POST` | Semantic search over clauses (embedding similarity) |
| `/api/embeddings` | `POST` | Generate embeddings for text |
| `/api/dashboard` | `GET` | Dashboard summary metrics |
| `/api/pipeline/{document_id}` | `POST` | Run the full agent pipeline on a document |
| `/api/pipeline/{job_id}` | `GET` | Check pipeline job status |
| `/api/pipeline/{job_id}` | `DELETE` | Cancel a running pipeline job |
| `/api/audit/{document_id}` | `GET` | Get audit trail for a document |

All request/response bodies are validated by Pydantic schemas defined in `app/schemas/`.

---

## 5. Frontend

The React frontend lives in `frontend/` and is built with Vite, TypeScript, and Tailwind CSS 4. It consumes the backend API through a thin client in `frontend/src/lib/api.ts`.

### Key Dependencies

| Package | Purpose |
|---------|---------|
| `react` / `react-dom` (v19) | UI framework |
| `react-router-dom` (v7) | Client-side routing |
| `tailwindcss` (v4) | Styling |
| `lucide-react` | Icon library |
| `@dnd-kit/core` | Drag-and-drop for task assignment |
| `recharts` | Dashboard charts |
| `zod` + `react-hook-form` | Form validation |
| `@radix-ui/react-*` | Accessible UI primitives |

### Routing

| Route | Component |
|-------|-----------|
| `/` | Dashboard |
| `/pipeline` | Pipeline overview |
| `/pipeline/:documentId` | Pipeline detail |
| `/documents` | Document list |
| `/documents/:id` | Document detail |
| `/clauses/:documentId` | Clause explorer for a document |
| `/obligations/:documentId` | Obligations list for a document |
| `/tasks` | Task board |
| `/evidence/:taskId` | Evidence viewer |
| `/compliance/:documentId` | Compliance evaluation |
| `/gap/:documentId` | Gap analysis |
| `/reports/:documentId` | Audit report |
| `/audit/:documentId` | Audit trail |

### API Client

The frontend API client (`frontend/src/lib/api.ts`) normalizes all paths to the `/api` prefix:

```ts
import { API_BASE_URL } from './config';

export const apiClient = {
  get: (path: string) => fetch(`${API_BASE_URL}/api${path}`),
  post: (path: string, body: any) =>
    fetch(`${API_BASE_URL}/api${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  // ... put, delete
};
```

**Required env var:** `VITE_API_URL` — set to your backend origin (e.g. `http://localhost:8000`).

---

## 6. Data Corpus

The project ships with a regulatory corpus mounted at `data/regulatory_corpus/`. Key files:

| File | Description |
|------|-------------|
| `SEBI Master Circular.pdf` | The full SEBI Master Circular (5 MB, ~150 pages). The primary source document. |
| `sebi_master_circular_stockbrokers.pdf` | A smaller, 941-byte stub used for rapid test runs. |
| `Test_Sample.pdf` | A 563 KB test document for quick pipeline runs. |
| `test_parsing.pdf` | A 993-byte PDF used in manual parsing tests. |
| `clauses_*.csv` | Exported clause segments from a prior segmentation run. Used as a baseline in `eval_clause_extraction.py`. |
| `gold_clauses_p10-20.json` | Gold-standard clause annotations for pages 10–20, produced by `scripts/build_gold_clauses.py`. Used for evaluation. |
| `gold_obligations.json` | Gold-standard obligation annotations for select clauses — the benchmark target for `eval_obligation_extraction.py`. |
| `_obligation_clauses.json` | Clause texts flagged as containing obligations, used by the obligation extraction benchmark to drive the agent. |

**Note:** `data/` is in `.gitignore`. The corpus files above are committed despite this because they are essential fixtures for testing and evaluation. The `.gitignore` rule is overridden for this directory.

---

## 7. Testing & Evaluation

### Unit Tests (`backend/tests/`)

Three pytest files using **in-process fake DBs** (no live MongoDB required):

| File | Tests |
|------|-------|
| `test_audit.py` | Audit trail recording and retrieval, pipeline log persistence, audit event ordering. |
| `test_evidence.py` | Evidence collection agent output, evidence status transitions, evidence-to-task linking. |
| `test_search_and_embedding.py` | Semantic search similarity ranking, embedding normalization, vector storage round-trip. |

Run all tests:

```bash
cd backend
pytest tests/ -v
```

### Evaluation Scripts (`backend/scripts/`)

Seven integration-style scripts that invoke the real agents against the gold-standard corpus (require `GROQ_API_KEY` and a populated MongoDB):

| Script | Purpose |
|--------|---------|
| `eval_obligation_extraction.py` | Benchmarks the `ObligationExtractionAgent` against `gold_obligations.json`. Reports recall, precision, exact-match, actor accuracy, deadline recall, and field-level accuracy. |
| `eval_clause_extraction.py` | Benchmarks `ClauseSegmentationAgent` against a gold clause set. Reports boundary recall, boundary precision, exact match, hierarchy accuracy, and TOC-leak detection. |
| `build_gold_clauses.py` | Exports a verified document's clause segmentation into a gold-standard JSON for use in `eval_clause_extraction.py --gold`. |
| `test_ingestion.py` | End-to-end ingestion test: uploads a PDF, verifies DB record and Cloudinary URL. |
| `test_parsing.py` | Verifies `ParsingAgent` produces text for each page. |
| `test_clause_segmentation.py` | Runs the full clause segmentation + validation pipeline and prints findings. |
| `test_obligation_extraction.py` | Runs obligation extraction on a sample document and dumps results. |
| `test_task_generation.py` | Runs task generation from extracted obligations and verifies task structure. |

Run an evaluation:

```bash
cd backend
python scripts/eval_obligation_extraction.py \
    --gold ../../data/regulatory_corpus/gold_obligations.json \
    --clauses ../../data/regulatory_corpus/_obligation_clauses.json
```

### Manual Upload Test

`backend/test_upload.py` — a standalone script using `requests` to test the `/api/documents` upload endpoint. Useful for verifying multipart form handling and Cloudinary integration.

```bash
cd backend
python test_upload.py --file ../../data/regulatory_corpus/Test_Sample.pdf
```

---

## 8. Development Setup

### Prerequisites

- Python 3.11+
- MongoDB (local or Atlas)
- Cloudinary account (for file storage)
- Groq API key (for LLM inference)
- Node.js 20+ (for frontend)

### Backend

```bash
cd backend
pip install -r ../requirements.txt

# Copy env template and fill in values
cp ../context/.env.example .env   # or create from scratch
# Edit .env with your MONGODB_URI, GROQ_API_KEY, CLOUDINARY_* (see Section 9)

# Run the API server
uvicorn app.main:app --reload --port 8000
```

The API docs are available at `http://localhost:8000/docs` (Swagger UI) and `http://localhost:8000/redoc` (ReDoc).

### Frontend

```bash
cd frontend
npm install

# Create .env file (see Section 9)
# VITE_API_URL=http://localhost:8000

npm run dev
```

The frontend proxies `/api` to `http://localhost:8000` via Vite's dev server proxy (configured in `vite.config.ts`).

---

## 9. .env Configuration

### Backend (`.env` in `backend/`)

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/regtrace` |
| `DATABASE_NAME` | MongoDB database name | `regtrace` |
| `GROQ_API_KEY` | Groq LLM API key | `gsk_...` |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | `my-cloud` |
| `CLOUDINARY_API_KEY` | Cloudinary API key | `123456789012345` |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | `your-secret` |
| `CORS_ORIGINS` | Comma-separated list of allowed CORS origins | `http://localhost:5173,http://localhost:3000` |

### Frontend (`.env` in `frontend/`)

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API origin URL | `http://localhost:8000` |

---

## 10. Scripts

| Script | Location | Command |
|--------|----------|---------|
| Obligation extraction benchmark | `backend/scripts/` | `python scripts/eval_obligation_extraction.py --gold ../../data/regulatory_corpus/gold_obligations.json --clauses ../../data/regulatory_corpus/_obligation_clauses.json` |
| Clause extraction benchmark | `backend/scripts/` | `python scripts/eval_clause_extraction.py <document_id> <baseline.csv> --gold <gold.json>` |
| Gold clause exporter | `backend/scripts/` | `python scripts/build_gold_clauses.py <document_id> <output.json>` |
| Manual upload test | `backend/` | `python test_upload.py --file ../../data/regulatory_corpus/Test_Sample.pdf` |
| Frontend dev server | `frontend/` | `npm run dev` |
| Backend dev server | `backend/` | `uvicorn app.main:app --reload` |
| Install deps (root) | repo root | `pip install -r requirements.txt` (backend) ; `npm install` (frontend) |

---

## 11. Design System

RegTrace follows the **"Real-Time / Operations Landing"** design pattern — clean, professional, and optimized for data-rich interfaces. The design system lives at `design-system/regtrace/` and is generated by UI-UX-Pro-Max.

### Tokens (`design-system/regtrace/MASTER.md`)

| Role | Hex |
|------|-----|
| Primary | `#0F172A` (navy) |
| Accent/CTA | `#0369A1` (blue) |
| Background | `#F8FAFC` |
| Foreground | `#020617` |
| Muted | `#E8ECF1` |
| Border | `#E2E8F0` |
| Destructive | `#DC2626` |

- **Font:** Plus Jakarta Sans (300–700 weights)
- **Style:** Flat design, no gradients, 150–300ms transitions, cursor-pointer on all interactive elements
- **Layout:** Section-first: Hero → Key metrics → How it works → CTA

### Page Templates

Reference files at `design-system/regtrace/pages/`:
- Dashboard
- Pipeline Overview
- Document Detail
- Clause Explorer
- Obligations List
- Task Board
- Evidence Viewer
- Compliance Scorecard
- Gap Analysis
- Audit Report

### Antipatterns (enforced)

- No emoji-as-icons (use SVG via lucide-react)
- No layout-shifting hovers
- All interactive elements must have `cursor-pointer`
- All inputs must have visible focus states

---

## 12. Deployment

### Backend (Render)

`render.yaml` at the project root defines a Python 3.11 web service for the FastAPI backend:

```yaml
services:
  - type: web
    name: regtrace-backend
    runtime: python3.11
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn app.main:app --host 0.0.0.0 --port $PORT
    envVars:
      - key: MONGODB_URI
        valueFromSecret: mongodb-uri
      - key: GROQ_API_KEY
        valueFromSecret: groq-api-key
```

### Frontend (Vercel)

`vercel.json` at the project root serves the React frontend as static files. The backend API is also mounted via `api/index.py` using **Mangum** (AWS Lambda adapter for ASGI apps), allowing the same FastAPI app to serve both static assets and API routes under `/api`:

```json
{
  "version": 2,
  "builds": [
    { "src": "frontend/index.html", "use": "static" },
    { "src": "api/index.py", "use": "python", "config": { "runtime": "python3.11" } }
  ],
  "routes": [
    { "src": "/api/(.*)", "dest": "/api/index.py" },
    { "src": "/(.*)", "dest": "/frontend/$1" }
  ]
}
```

**Note:** On Vercel, the backend runs in serverless mode (AWS Lambda via Mangum). This means cold starts on first request and stateful objects (LLM clients, embedding models) are re-initialized per invocation. For local development, use `uvicorn app.main:app` directly.

---

## 13. Project Structure

```
RegTrace/
├── README.md                          # This file
├── requirements.txt                   # Python dependencies (root)
├── vercel.json                        # Vercel deployment config
├── render.yaml                        # Render deployment config
├── api/
│   └── index.py                       # Vercel serverless entry (Mangum)
├── backend/
│   ├── app/
│   │   ├── main.py                    # FastAPI app + router registration
│   │   ├── config.py                  # Settings (pydantic-settings)
│   │   ├── api/
│   │   │   └── routes/                # 12 route files (documents, clauses,
│   │   │                               #   obligations, tasks, pipeline,
│   │   │                               #   evidence, compliance, gap,
│   │   │                               #   reports, search, embeddings,
│   │   │                               #   dashboard, audit)
│   │   ├── models/                    # MongoDB Pydantic models (document,
│   │   │                               #   clause, obligation, task, evidence)
│   │   ├── schemas/                   # API Pydantic schemas (13 schema modules)
│   │   ├── agents/                    # 7 agents + BaseAgent
│   │   │   ├── base_agent.py
│   │   │   ├── ingestion_agent.py
│   │   │   ├── parsing_agent.py
│   │   │   ├── clause_segmentation_agent.py
│   │   │   ├── obligation_extraction_agent.py
│   │   │   ├── task_generation_agent.py
│   │   │   └── evidence_collection_agent.py
│   │   ├── services/                  # 9 service modules
│   │   │   ├── ingestion_service.py
│   │   │   ├── parsing_service.py
│   │   │   ├── clause_service.py
│   │   │   ├── obligation_service.py
│   │   │   ├── task_service.py
│   │   │   ├── evidence_service.py
│   │   │   ├── compliance_service.py
│   │   │   ├── gap_service.py
│   │   │   ├── report_service.py
│   │   │   ├── audit_service.py
│   │   │   ├── pipeline_service.py
│   │   │   ├── clause_validator.py
│   │   │   └── job_registry.py
│   │   ├── db/
│   │   │   └── mongodb.py             # Motor connection manager
│   │   ├── utils/
│   │   │   ├── layout.py              # Rule-based clause pre-segmentation
│   │   │   ├── storage.py             # Cloudinary upload/helpers
│   │   │   └── pipeline_log.py        # Structured pipeline logging
│   │   ├── core/
│   │   │   └── embeddings.py          # Sentence-transformers wrapper
│   │   ├── pipeline/
│   │   │   └── jobs.py                # Async pipeline job runner
│   │   └── .env                       # Backend env (gitignore'd)
│   ├── tests/
│   │   ├── test_audit.py
│   │   ├── test_evidence.py
│   │   └── test_search_and_embedding.py
│   ├── scripts/                       # 7 eval/test scripts
│   └── test_upload.py                 # Manual upload test
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── lib/
│       │   ├── api.ts                 # API client (normalizes /api prefix)
│       │   └── config.ts              # VITE_API_URL
│       ├── routes/                    # React Router v7 route components
│       ├── components/
│       │   ├── layout/                # Nav, header, sidebar
│       │   ├── documents/
│       │   ├── clauses/
│       │   ├── obligations/
│       │   ├── tasks/
│       │   ├── evidence/
│       │   ├── compliance/
│       │   ├── reports/
│       │   ├── dashboard/
│       │   └── audit/
│       └── hooks/                     # Custom React hooks
├── data/
│   └── regulatory_corpus/             # SEBI PDFs, gold clauses, gold obligations
├── design-system/
│   └── regtrace/
│       ├── MASTER.md                  # Color tokens, typography, spacing
│       └── pages/                     # Per-page design specs
├── context/                           # Project docs & specs
│   ├── 1-PRD.md
│   ├── 2-ARCHITECTURE.md
│   ├── 3-MODULES.md
│   ├── Folder_Structure.md
│   ├── Module-Wise-Design/            # 8 agent design docs
│   │   ├── 1-Ingestion-Agent.md
│   │   ├── 2-Parsing-Agent.md
│   │   ├── 3-Clause-Segmentation-Agent.md
│   │   ├── 4-Obligation-Extraction-Agent.md
│   │   ├── 5-Evidence-Collection-Agent.md
│   │   ├── 5-Task-Generation-Agent.md
│   │   ├── 6-Compliance-Evaluation-Agent.md
│   │   ├── 7-Gap-Analysis-Agent.md
│   │   └── 8-Audit-Report-Agent.md
│   └── wireframes/                    # Dashboard, documents, clauses, processing
└── scripts/                           # Root-level scripts (currently empty)
```

---

## 14. License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

You are free to use, modify, and distribute RegTrace for commercial or personal purposes, provided you retain the original copyright notice and license text.

---

*For full PRD, architecture specs, and module-wise design docs, see the [`context/`](context/) directory.*