# API & Module Specification
**Project Name:** Agentic Compliance: From Regulatory Text to Operational Action
**Phase:** Phase 3 - API & Module Specification

---

## PART 1 — MODULE CATALOG

The backend system is divided into the following logical modules, acting as the core business boundaries.

**1. Identity & Access Management (IAM) Module**
- **Purpose:** Handles authentication and role-based authorization.
- **Responsibilities:** Verifying credentials, issuing JWTs, validating tenant context (`org_id`).
- **Dependencies:** Database (Users, Roles).
- **Public Interfaces:** Auth API.
- **Internal Components:** TokenService, AuthService, PasswordHasher.

**2. Document Ingestion Module**
- **Purpose:** Manages the uploading and storage of SEBI regulatory texts.
- **Responsibilities:** Validating file formats, storing to Object Storage, triggering the AI Engine.
- **Dependencies:** Database (Document Metadata), Object Storage, AI Engine.
- **Public Interfaces:** Document API.
- **Internal Components:** StorageService, AIIntegrationService.

**3. Global Regulation & Obligation Module**
- **Purpose:** Manages the structured, machine-actionable rules extracted by the AI Engine.
- **Responsibilities:** Categorizing rules, updating regulation versions.
- **Dependencies:** Database (Global Domain).
- **Public Interfaces:** Regulation API.
- **Internal Components:** ObligationManager.

**4. Compliance Task & Workflow Module**
- **Purpose:** Manages tenant-specific operational tasks generated from Global Obligations.
- **Responsibilities:** Task assignment, status transition, deadline tracking.
- **Dependencies:** Database (Tenant Domain), IAM Module.
- **Public Interfaces:** Task API.
- **Internal Components:** WorkflowEngine, TaskAssigner.

**5. Evidence Management Module**
- **Purpose:** Handles proof of compliance submitted against tasks.
- **Responsibilities:** File upload handling, mapping evidence to tasks, verification workflows.
- **Dependencies:** Database, Object Storage.
- **Public Interfaces:** Evidence API.
- **Internal Components:** EvidenceVerifier.

**6. Audit & Notification Module**
- **Purpose:** Maintains the immutable ledger and triggers alerts.
- **Responsibilities:** Intercepting domain events, appending to the audit log, sending email/webhook alerts.
- **Dependencies:** Database (System Domain).
- **Public Interfaces:** Audit API.
- **Internal Components:** EventBus, AuditLogger, NotificationService.

---

## PART 2 — API SPECIFICATION

*(Representational endpoints covering core functionality)*

### 1. Document Upload API
- **Endpoint:** `POST /api/v1/documents`
- **Purpose:** Upload a SEBI Master Circular and trigger AI extraction.
- **Request Parameters:** None.
- **Request Body:** `multipart/form-data` (file).
- **Response Body:** `DocumentResponseDTO`
- **Success Codes:** `202 Accepted` (processing started).
- **Error Codes:** `400 Bad Request` (invalid file), `401 Unauthorized`.
- **Auth/Authz:** Required / Admin Only.
- **Validation Rules:** File must be PDF, max size 50MB.

### 2. List Obligations API
- **Endpoint:** `GET /api/v1/regulations/{id}/obligations`
- **Purpose:** Retrieve structured obligations extracted from a regulation.
- **Request Parameters:** `id` (UUID in path).
- **Request Body:** None.
- **Response Body:** `PaginatedObligationsDTO`
- **Success Codes:** `200 OK`.
- **Error Codes:** `404 Not Found`.
- **Auth/Authz:** Required / All Authenticated Users.
- **Validation Rules:** `id` must be valid UUID.

### 3. List Compliance Tasks API
- **Endpoint:** `GET /api/v1/tasks`
- **Purpose:** Retrieve tasks for the authenticated user's organization.
- **Request Parameters:** Query params (`status`, `due_date_before`, `assigned_to`, `limit`, `offset`).
- **Request Body:** None.
- **Response Body:** `PaginatedTasksDTO`
- **Success Codes:** `200 OK`.
- **Error Codes:** `401 Unauthorized`.
- **Auth/Authz:** Required / Tied to User's `org_id`.
- **Validation Rules:** Pagination limits must be between 1 and 100.

### 4. Submit Evidence API
- **Endpoint:** `POST /api/v1/tasks/{taskId}/evidence`
- **Purpose:** Attach proof to a compliance task.
- **Request Parameters:** `taskId` (UUID in path).
- **Request Body:** `multipart/form-data` or `EvidenceLinkRequestDTO`.
- **Response Body:** `EvidenceResponseDTO`
- **Success Codes:** `201 Created`.
- **Error Codes:** `403 Forbidden` (task belongs to another org), `404 Not Found`.
- **Auth/Authz:** Required / Must have 'Upload_Evidence' permission.
- **Validation Rules:** Cannot upload evidence to a closed/verified task.

---

## PART 3 — DTO SPECIFICATION

**1. DocumentResponseDTO (Output)**
- `id` (UUID, Req)
- `fileName` (String, Req)
- `status` (Enum: PROCESSING, Req)
- `uploadedAt` (Timestamp, Req)

**2. TaskResponseDTO (Output)**
- `id` (UUID, Req)
- `obligationId` (UUID, Req)
- `status` (Enum: PENDING, SUBMITTED, VERIFIED, OVERDUE, Req)
- `dueDate` (Timestamp, Req)
- `assignedTo` (UUID, Opt)

**3. EvidenceLinkRequestDTO (Input)**
- `linkUrl` (String, Req, must be valid URI)
- `comments` (String, Opt, max 500 chars)

---

## PART 4 — MODULE INTERFACES

*(Internal programmatic contracts)*

**IDocumentService**
- `processUpload(file: Binary): DocumentMetadata`
- Errors: `InvalidFileException`, `StorageException`
- Events Generated: `DocumentUploaded`

**IAIEngineClient**
- `triggerExtraction(documentId: UUID): JobId`
- Errors: `AIProcessingException`
- Dependencies: HTTP Client.

**ITaskManager**
- `generateTasksForObligation(obligation: Obligation): void`
- `updateTaskStatus(taskId: UUID, newStatus: TaskStatus): Task`
- Errors: `TaskNotFoundException`, `InvalidStateTransitionException`
- Events Generated: `TaskCreated`, `TaskStatusChanged`

**IAuditLogger**
- `logEvent(entityType: String, entityId: UUID, action: String, payload: JSON): void`
- Expected Output: None (Fire and forget).
- Dependencies: Database.

---

## PART 5 — EVENT CONTRACTS

The system utilizes an event-driven architecture internally to decouple modules.

1. **DocumentUploaded**
   - **Publisher:** Document Ingestion Module
   - **Subscribers:** AI Integration Service
   - **Payload:** `{ documentId: UUID, storagePath: String }`
   - **Purpose:** Triggers the AI Engine to begin parsing the PDF.

2. **ObligationExtracted**
   - **Publisher:** AI Integration Service (via webhook/polling)
   - **Subscribers:** Compliance Task Module
   - **Payload:** `{ regulationId: UUID, obligations: [ObligationDTO] }`
   - **Purpose:** Signals the system to generate operational tasks for affected tenants.

3. **TaskCreated**
   - **Publisher:** Compliance Task Module
   - **Subscribers:** Audit Module, Notification Module
   - **Payload:** `{ taskId: UUID, orgId: UUID, dueDate: Timestamp }`
   - **Purpose:** Logs the creation and alerts the assigned compliance officer.

4. **EvidenceUploaded**
   - **Publisher:** Evidence Management Module
   - **Subscribers:** Compliance Task Module, Audit Module
   - **Payload:** `{ evidenceId: UUID, taskId: UUID, uploadedBy: UUID }`
   - **Purpose:** Transitions task status to 'SUBMITTED' and logs the action.

5. **SLABreached / ReminderTriggered**
   - **Publisher:** Background Worker (Cron)
   - **Subscribers:** Notification Module, Audit Module
   - **Payload:** `{ taskId: UUID, orgId: UUID, daysOverdue: Int }`
   - **Purpose:** Automatically escalates overdue tasks.

---

## PART 6 — ERROR HANDLING

All APIs must return errors in a standardized JSON format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input parameters",
    "details": [
      { "field": "dueDate", "issue": "Must be a future date" }
    ],
    "traceId": "uuid-for-logging"
  }
}
```

**Standard Codes:**
- `VALIDATION_ERROR`: 400 Bad Request
- `AUTHENTICATION_ERROR`: 401 Unauthorized (Missing/invalid token)
- `AUTHORIZATION_ERROR`: 403 Forbidden (Missing permissions or tenant mismatch)
- `NOT_FOUND_ERROR`: 404 Not Found
- `BUSINESS_RULE_ERROR`: 422 Unprocessable Entity (e.g., "Cannot verify a task without evidence")
- `SYSTEM_ERROR`: 500 Internal Server Error (Database down, etc.)

---

## PART 7 — API STANDARDS

- **Versioning:** URI-based (e.g., `/api/v1/...`).
- **Naming Conventions:**
  - Endpoints: Kebab-case, plural nouns (e.g., `/compliance-tasks`).
  - JSON Payloads: camelCase keys (e.g., `dueDate`).
- **Pagination:** Offset-based (`?limit=20&offset=0`). Responses must include `{ data: [], meta: { total: 100, limit: 20, offset: 0 } }`.
- **Sorting/Filtering:** Query params formatted as `?sortBy=dueDate:asc` and `?status=PENDING`.
- **Date Format & Time Zones:** All timestamps must be ISO 8601 strings in UTC (e.g., `2026-07-10T10:00:00Z`).

---

## PART 8 — SECURITY CONTRACTS

- **Authentication Flow:** Stateless JWT (JSON Web Tokens). Clients obtain a token via `/api/v1/auth/login` and pass it in the `Authorization: Bearer <token>` header.
- **Token Handling:** Tokens contain `userId`, `orgId`, and `roleId`. Tokens expire after 1 hour (refresh token strategy required).
- **Authorization Flow:** Middleware explicitly checks the `orgId` in the token against the `org_id` of the requested resource.
- **Permission Checks:** Controller methods must be decorated with required RBAC roles (e.g., `@RequireRole('COMPLIANCE_OFFICER')`). Cross-tenant access is strictly blocked at the routing layer.

---

## PART 9 — IMPLEMENTATION ORDER

To unblock parallel development streams, backend APIs should be built in the following order:

1. **IAM & Auth APIs:** Foundational for everything. (Provides JWTs for all subsequent testing).
2. **Global Regulation & Obligation APIs:** Read-only endpoints to serve mock data before the AI Engine is ready.
3. **Document Ingestion APIs:** Requires object storage setup. Mocks the AI event trigger initially.
4. **Compliance Task APIs:** Core CRUD operations. Depends on IAM for tenant filtering.
5. **Evidence APIs:** Depends on Tasks. Completes the primary user journey.
6. **Background Worker & Audit Events:** Implemented last to wire up notifications and automated status transitions.

---

## PART 10 — OUTPUT
*(This document serves as the formal API & Module Specification. It is the strict implementation contract for backend engineers. Do not alter interfaces or DTO structures without updating this document and obtaining architectural review.)*
