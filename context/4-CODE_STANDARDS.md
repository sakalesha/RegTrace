# Code Standards Document

**Project:** RegTrace
**Version:** 1.0
**Status:** Pre-Implementation
**Owner:** Team RegTrace

---

# 1. Purpose

This document defines the coding standards and development conventions for RegTrace.

The objectives are:

* maintain consistency across the codebase
* improve readability
* simplify code reviews
* reduce bugs caused by inconsistent patterns
* enable parallel development across frontend, backend, and AI modules

All contributors must follow this document before committing code.

---

# 2. General Engineering Principles

Every module must follow these principles:

* Single Responsibility Principle
* Explicit over implicit behavior
* Fail fast with meaningful errors
* Keep functions small and focused
* Avoid duplicate logic
* Prefer composition over inheritance
* Write testable code
* Make AI outputs deterministic wherever possible
* Preserve auditability of compliance data

---

# 3. Repository Structure

repository/

docs/

backend/

frontend/

scripts/

tests/

README.md

No business logic should exist outside backend/ and frontend/.

---

# 4. Backend Standards (Python / FastAPI)

## 4.1 Python Version

Python 3.11+

---

## 4.2 Formatting

Use:

* Black
* isort
* Ruff

Maximum line length:

88 characters

---

## 4.3 Naming Conventions

### Files

snake_case

Examples:

document_service.py

task_assignment_agent.py

### Classes

PascalCase

Examples:

DocumentService

ObligationExtractor

### Functions

snake_case

Examples:

extract_obligations()

generate_tasks()

### Variables

snake_case

Examples:

document_id

clause_text

confidence_score

### Constants

UPPER_SNAKE_CASE

Examples:

MAX_FILE_SIZE

DEFAULT_TIMEOUT

---

## 4.4 Function Rules

Good:

def extract_obligations(clause):

Bad:

def doEverything(clause):

Functions should:

* perform one task
* return structured values
* avoid hidden side effects
* avoid database access unless they belong to a service/repository layer

---

## 4.5 Type Hints

All public functions must include type hints.

Example:

def get_document(document_id: str) -> Document:

---

## 4.6 Docstrings

Use Google-style docstrings.

Example:

def extract_text(path: str) -> str:

Extract text from a PDF file.

Args:

path: Absolute file path.

Returns:

Extracted text.

---

# 5. FastAPI Standards

## 5.1 Route Naming

Use plural resource names.

Correct:

GET /documents

POST /documents/upload

GET /tasks

PUT /tasks/{id}

Incorrect:

/getDocument

/uploadFile

/taskList

---

## 5.2 Response Format

All API responses must follow a consistent structure.

Success:

{

"success": true,

"data": {},

"message": "Document uploaded successfully"

}

Error:

{

"success": false,

"error": {

"code": "DOCUMENT_NOT_FOUND",

"message": "Document does not exist"

}

}

---

## 5.3 Validation

Use Pydantic models for:

* requests
* responses
* agent inputs
* agent outputs

Never accept raw dictionaries in API handlers.

---

# 6. Frontend Standards (React)

## 6.1 Folder Naming

Use kebab-case.

Examples:

document-upload/

obligation-review/

task-dashboard/

---

## 6.2 Component Naming

PascalCase

Examples:

DocumentUpload.jsx

TaskTable.jsx

EvidencePanel.jsx

---

## 6.3 Hooks

Prefix with use.

Examples:

useDocuments()

useTasks()

useDashboard()

---

## 6.4 Component Rules

Each component should:

* be reusable
* receive data through props
* avoid direct API calls when possible
* avoid business logic

API calls belong in:

services/

or

hooks/

---

## 6.5 State Management

Use:

* React hooks
* Context only for shared global state

Avoid deeply nested prop chains.

---

# 7. API Layer Standards

All frontend API communication goes through:

services/api.js

Never call fetch() directly inside UI components.

Correct:

documentService.upload(file)

Incorrect:

fetch('/documents/upload')

inside a React component.

---

# 8. Database Standards (MongoDB)

## 8.1 Collection Naming

Use lowercase plural names.

Examples:

documents

clauses

obligations

tasks

evidence

audit_reports

---

## 8.2 Document IDs

Use UUID strings for public identifiers.

Internal Mongo ObjectIds may exist but should not be exposed directly.

---

## 8.3 Timestamp Fields

Every collection must contain:

created_at

updated_at

ISO 8601 format.

---

## 8.4 Status Fields

Statuses must be enums.

Example:

"UPLOADED"

"PARSED"

"TASKS_CREATED"

Do not store arbitrary strings.

---

# 9. AI Agent Standards

## 9.1 Agent Structure

Each agent must expose:

run(input)

Input and output must be Pydantic models.

---

## 9.2 Prompt Files

Prompts must live in:

backend/prompts/

One prompt file per agent.

Example:

obligation_extraction.md

---

## 9.3 Deterministic Output

LLM responses must be validated.

Never trust raw LLM output directly.

Required:

* schema validation
* retry logic
* fallback handling

---

## 9.4 Confidence Scores

All AI-generated entities must include:

confidence

Range:

0.0 – 1.0

---

# 10. Error Handling Standards

## 10.1 Exceptions

Raise specific exceptions.

Correct:

raise DocumentNotFoundError()

Incorrect:

raise Exception()

---

## 10.2 Logging

Every exception must log:

* timestamp
* module
* function
* document_id (if available)
* stack trace

---

## 10.3 User Messages

Internal errors must not expose stack traces to users.

Good:

"Unable to generate report."

Bad:

Python traceback...

---

# 11. Logging Standards

Use Python logging.

Log levels:

DEBUG

INFO

WARNING

ERROR

CRITICAL

Format:

timestamp

trace_id

module

function

message

Example:

2026-08-09T10:15:22Z

TRACE123

obligation_service

extract

14 obligations extracted

---

# 12. Configuration Management

Use environment variables.

Examples:

MONGODB_URI

LLM_API_KEY

R2_BUCKET

Never hardcode:

* secrets
* API keys
* database credentials
* file paths

Use:

.env

for development.

---

# 13. Testing Standards

## 13.1 Backend

Use:

pytest

Structure:

tests/

test_document_service.py

test_obligation_agent.py

---

## 13.2 Frontend

Use:

React Testing Library

Component tests:

DocumentUpload.test.jsx

---

## 13.3 AI Agents

Each agent requires:

* unit tests
* schema validation tests
* prompt regression tests

---

# 14. Git Standards

## Branch Naming

feature/document-upload

feature/task-dashboard

fix/ocr-parser

refactor/agent-pipeline

---

## Commit Format

feat:

fix:

refactor:

docs:

test:

Example:

feat: implement obligation extraction agent

---

# 15. Code Review Checklist

Before merging:

* follows naming conventions
* formatted correctly
* includes type hints
* includes tests
* no dead code
* no secrets committed
* logs meaningful events
* handles errors gracefully
* updates documentation if required

---

# 16. Documentation Standards

Every module must contain:

* purpose
* inputs
* outputs
* dependencies
* usage example

Public APIs require OpenAPI documentation.

Complex workflows require architecture documentation.

---

# 17. Performance Standards

Avoid:

* repeated database queries
* repeated LLM calls
* loading entire documents unnecessarily

Prefer:

* batching
* caching where appropriate
* streaming large files
* asynchronous I/O

---

# 18. Security Standards

Validate:

* file type
* file size
* user input
* metadata

Sanitize:

* filenames
* search queries
* text inputs

Never:

* execute uploaded files
* trust client-provided identifiers
* expose internal database IDs

---

# 19. Auditability Requirements

Every compliance-related change must be traceable.

Store:

* previous value
* new value
* actor
* timestamp
* document reference

Evidence records must be immutable after submission.

---

# 20. Summary

RegTrace follows strict engineering conventions across Python, FastAPI, React, MongoDB, and the AI workflow engine. These standards ensure consistency, maintainability, security, auditability, and scalability across all modules of the system while enabling multiple contributors to develop features in parallel without introducing architectural drift.
