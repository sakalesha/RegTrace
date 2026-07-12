# Repository Structure & Development Standards Guide
**Project Name:** Agentic Compliance: From Regulatory Text to Operational Action
**Phase:** Phase 5 - Repository & Development Standards

---

## PART 1 — MONOREPO STRUCTURE

The project is structured as a unified monorepo to ensure seamless integration and shared context across the full stack. 

```text
/
├── backend/       # FastAPI core server, AI engine, and Celery workers
├── frontend/      # React.js application
├── shared/        # Shared DTO definitions, OpenAPI schemas, and common constants
├── docs/          # Architecture decisions (ADRs) and API specifications
├── infra/         # Infrastructure as Code (e.g., Terraform)
├── deployment/    # Docker Compose, Kubernetes manifests, CI/CD pipelines
├── scripts/       # Local automation, seeders, and utility bash scripts
└── tests/         # E2E integration tests spanning frontend and backend
```

**Purpose of Directories:**
- **`backend/`**: Contains the complete Python backend ecosystem. It is forbidden to place client-side code here.
- **`frontend/`**: Contains the React SPA. It is forbidden to store hardcoded secrets or direct database access logic here.
- **`shared/`**: Contains language-agnostic contracts (like JSON schemas) ensuring the frontend and backend stay in sync.
- **`docs/`**: Acts as the single source of truth for architectural planning.
- **`infra/` & `deployment/`**: Isolates operations and DevOps logic from application code.
- **`tests/`**: Dedicated to system-wide end-to-end testing (e.g., Cypress/Playwright).

---

## PART 2 — BACKEND STRUCTURE

The `backend/` directory strictly follows a Domain-Driven, Layered Architecture tailored for FastAPI.

```text
backend/
├── app/
│   ├── api/            # API routing and HTTP endpoint definitions
│   ├── auth/           # JWT verification and RBAC checks
│   ├── config/         # Environment variable schemas and loaders (Pydantic Settings)
│   ├── core/           # Core system dependencies and app initialization
│   ├── database/       # DB session management (MongoDB, Neo4j, Qdrant)
│   ├── exceptions/     # Custom HTTP and Domain exception classes
│   ├── middleware/     # Request logging, CORS, rate limiting
│   ├── models/         # Database ORM/ODM models (e.g., Beanie/Motor schemas)
│   ├── schemas/        # Pydantic DTOs for request/response validation
│   ├── repositories/   # Data access layer (abstracting queries from services)
│   ├── services/       # Core business logic and use cases
│   ├── utils/          # Stateless helper functions
│   ├── workers/        # Celery task definitions and Redis queue management
│   ├── agents/         # LangGraph AI agent orchestration
│   ├── rag/            # Retrieval-Augmented Generation flows
│   ├── graph/          # Neo4j specific relationship mapping logic
│   ├── vector/         # Qdrant vector search operations
│   └── tests/          # Unit and integration tests (pytest)
```

**Responsibilities:**
- **`api/`**: Only handles HTTP parsing. Calls `services/`. *Forbidden: Business logic or DB queries.*
- **`repositories/`**: Only layer allowed to execute queries against MongoDB/Neo4j.
- **`services/`**: Implements business rules. Calls `repositories/`, `agents/`, or `workers/`.
- **`workers/`**: Contains idempotent Celery background tasks. *Forbidden: Direct API responses.*

---

## PART 3 — FRONTEND STRUCTURE

The `frontend/` directory follows a modular React/Vite architecture.

```text
frontend/src/
├── api/          # Axios instances, interceptors, and API client wrappers
├── assets/       # Static files, images, icons
├── components/   # Reusable, stateless UI components (Buttons, Modals)
├── contexts/     # React Context providers (Auth, Theme)
├── hooks/        # Custom reusable React hooks
├── layouts/      # Page layout wrappers (Sidebar, Header, Footer)
├── pages/        # Route-level components mapping to specific URLs
├── services/     # Business logic specific to the frontend
├── store/        # Global state management (Zustand/Redux)
├── styles/       # Global CSS and Tailwind directives
├── types/        # TypeScript interfaces and type definitions
├── utils/        # Formatting and validation helpers
└── tests/        # Jest/Vitest unit tests for components
```

**Responsibilities:**
- **`pages/`**: Connects to the store/API and passes data down to `components/`.
- **`components/`**: Pure UI representation. Should not make direct API calls.
- **`api/`**: Centralizes all backend network requests to enforce consistent error handling and JWT injection.

---

## PART 4 — AI STRUCTURE

The AI components reside within the backend but are highly segregated due to their specialized nature.

```text
backend/app/
├── agents/         # LangGraph state definitions and multi-agent workflows
├── prompts/        # Version-controlled Jinja/string templates for LLM instructions
├── embeddings/     # all-MiniLM-L6-v2 generation wrappers
├── parsers/        # PyMuPDF and Tesseract OCR execution logic
├── chunking/       # Semantic text splitters for processing large circulars
├── retrieval/      # Qdrant querying algorithms (e.g., MMR, Cosine Similarity)
├── reasoning/      # Core logic where the Configurable LLM processes context
└── knowledge_graph/# Logic for translating LLM outputs into Neo4j nodes/edges
```

**Responsibilities:**
- **`parsers/`**: Extracts raw text. *Must gracefully fallback to OCR if needed.*
- **`agents/`**: Orchestrates the flow from parsing -> chunking -> reasoning.
- **`prompts/`**: Must never be hardcoded inline. Always loaded from the `prompts/` directory to allow easy tuning.

---

## PART 5 — CONFIGURATION MANAGEMENT

- **Environment Variables**: Loaded strictly via Pydantic `BaseSettings` in the backend and `import.meta.env` in Vite.
- **Configuration Loading**: The app must fail at startup if a required environment variable is missing.
- **Secrets Management**: Hardcoding secrets (API keys, DB URIs) is strictly forbidden. Use a local `.env` file (gitignored) for development and Kubernetes Secrets / AWS Secrets Manager in production.
- **Environment Separation**: Distinct `.env.development`, `.env.staging`, and `.env.production` files manage environment-specific behaviors.

---

## PART 6 — CODING STANDARDS

- **Naming Conventions:**
  - **Folders**: `snake_case` (Python), `kebab-case` (React/Shared).
  - **Files**: `snake_case.py` (Python), `PascalCase.tsx` (React Components), `camelCase.ts` (React Utils).
  - **Classes**: `PascalCase` (e.g., `DocumentService`, `AuthContext`).
  - **Functions/Variables**: `snake_case` (Python), `camelCase` (React).
  - **Constants / Env Vars**: `UPPER_SNAKE_CASE` (e.g., `MAX_RETRIES`, `VITE_API_URL`).
- **File Organization**: Keep files under 300 lines. Extract complex logic into smaller, testable utility functions.

---

## PART 7 — ERROR HANDLING

- **Exceptions**: Use custom domain exceptions (e.g., `DocumentNotFoundException`). Do not expose raw database errors to the client.
- **Validation**: Use Pydantic (Backend) and Zod/Yup (Frontend) for input validation at the absolute boundary.
- **Logging**: Log exceptions with stack traces at the `ERROR` level, including `trace_id` and `user_id`.
- **Error Responses**: All API errors must return a standard format:
  ```json
  { "error": { "code": "VALIDATION_ERROR", "message": "Invalid input", "details": [...] } }
  ```
- **Retry Strategy**: Network calls to external LLMs and Databases must implement exponential backoff (e.g., using `tenacity` in Python).

---

## PART 8 — LOGGING STANDARDS

Use structured JSON logging (e.g., `structlog` in Python).
- **Application Logging**: Log request start, end, and duration (`INFO`).
- **AI Logging**: Log prompt token count, model selected, and confidence scores (`INFO`). Log LLM hallucinations or parsing failures (`WARN`).
- **Worker Logging**: Log job start, completion, retries, and failures (`INFO`/`ERROR`).
- **Database Logging**: Log slow queries (> 500ms) (`WARN`). Do not log sensitive PII or raw passwords.
- **Security Logging**: Log all login attempts, role escalation, and unauthorized access attempts (`WARN`/`ERROR`).

---

## PART 9 — GIT STANDARDS

- **Branch Strategy**: Trunk-based development. 
  - `main`: Production-ready.
  - `feature/name-of-feature`: Active development.
  - `bugfix/issue-description`: Fixes.
- **Commit Message Convention**: Conventional Commits.
  - `feat: add PDF parser fallback`
  - `fix: resolve JWT expiration issue`
  - `docs: update setup instructions`
- **Pull Request Checklist**: Must pass CI/CD tests, include a summary of changes, and link to a ticketing issue.
- **Code Review Checklist**: Verify architecture adherence, check for missing edge cases, ensure tests are added, and confirm no secrets are committed. At least 1 peer approval is required.

---

## PART 10 — TESTING STANDARDS

- **Unit Tests**: Test single functions/classes using mocks. Must cover all `services/` and `utils/`.
- **Integration Tests**: Test Database and Redis interactions. Must cover all `repositories/`.
- **API Tests**: Hit FastAPI endpoints using `TestClient`.
- **AI Tests**: Use deterministic mock LLM responses to test LangGraph routing logic without incurring API costs.
- **Frontend Tests**: Test component rendering and hooks using React Testing Library.
- **Folder Organization**: Tests live in a dedicated `tests/` folder at the module root, mirroring the `src` folder structure.
- **Coverage Expectations**: Minimum 80% line coverage for backend services and frontend utilities.

---

## PART 11 — DOCUMENTATION STANDARDS

- **README Structure**: Every top-level directory must have a README detailing: Purpose, Prerequisites, Local Setup Commands, and Environment Variables.
- **Module Documentation**: Use Python Docstrings (`"""`) and JSDoc (`/** */`) to explain complex business logic within files.
- **Architecture Documentation**: Updated in the root `docs/` folder using Markdown.
- **API Documentation**: Auto-generated via FastAPI's OpenAPI integration (`/docs`). Ensure all routes have tags, summaries, and response models.
- **Developer Onboarding**: This document (Phase 5) serves as the primary onboarding manual.

---

## PART 12 — DEVELOPMENT WORKFLOW

The standard lifecycle for implementing a module or feature:
1. **Requirement**: Developer picks up a defined task.
2. **Design Review**: If structural changes are needed, discuss with the architecture team.
3. **Implementation**: Developer branches off `main`, writes code, and adheres to standards.
4. **Testing**: Developer writes unit/integration tests ensuring edge cases are covered.
5. **Code Review**: PR is opened, CI pipelines run (lint, test), and peers review the code.
6. **Merge**: Code is squashed and merged into `main` for deployment.

---

## PART 13 — DEFINITION OF DONE

Every module or feature must satisfy the following checklist before being merged:
- [ ] Architecture followed
- [ ] API contract followed
- [ ] Database contract followed
- [ ] Coding standards followed
- [ ] Tests written (Unit/Integration)
- [ ] Documentation updated (Swagger/READMEs)
- [ ] Logging implemented (Structured JSON)
- [ ] Error handling implemented (Custom Exceptions)
- [ ] No linting errors (Flake8, Black, ESLint passing)
- [ ] Code reviewed (1+ approvals)

---

## PART 14 — OUTPUT
*(This document serves as the official Repository Structure & Development Standards Guide for the Agentic Compliance project, aligned explicitly with the approved Python/React/MongoDB tech stack.)*
