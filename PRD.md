# Business Operations Platform
## Product Requirements Document (PRD)

**Version:** 1.1  
**Status:** Proposed / Expanded MVP Scope  
**Date:** 2026-08-23  
**Product Type:** Single-tenant modular business operations platform  
**Primary Modules:** Contract & Document Expiry Tracker, Office Automation

---

## 1. Product Overview

Version 1.1 evolves the Contract & Document Expiry Tracker into a reusable **Business Operations Platform**.

The new **Office Automation** module replaces the previous spreadsheet-centered operational workflow. Google Spreadsheet is removed as the production operational database; PostgreSQL becomes the single source of truth.

n8n remains part of the architecture as the integration and automation layer, especially for **Telegram** and future external integrations.

Existing registered users are reused across modules. Employees do not need a second registration system.

Core architectural principle:

> **PostgreSQL owns the data. NestJS owns the business rules. Next.js owns the user experience. n8n owns external integrations and automation workflows. Telegram is an integration channel, not a system of record.**

---

## 2. Goals

1. Extend the existing Contract & Document Expiry Tracker into a reusable business platform.
2. Add Office Automation as the second business module.
3. Migrate Office Automation data from Google Spreadsheet to PostgreSQL.
4. Keep n8n for Telegram and external automation/integration.
5. Reuse one authentication and user system across all modules.
6. Allow existing SUPERUSER, EDITOR, and VIEWER users to access enabled modules without re-registration.
7. Support ordinary employee access to Office Automation.
8. Introduce module-level access and permissions.
9. Provide a premium responsive business UX.
10. Keep deployment and operating costs low.

---

## 3. Scope

### 3.1 Platform

- Authentication.
- User management.
- RBAC.
- Module access and permissions.
- Audit logging.
- Notifications.
- Scheduler/background jobs.
- PostgreSQL/Prisma.
- S3-compatible object storage.
- n8n integration layer.
- Transactional integration events/outbox.

### 3.2 Contract & Document Expiry Tracker

The existing module remains in scope:

- Document CRUD.
- File upload/download authorization.
- S3-compatible storage.
- Expiry status calculation.
- Configurable reminders.
- Dashboard.
- Search/filter.
- Audit history.
- Email notifications.

### 3.3 Office Automation

The second module modernizes the previous Google Spreadsheet + n8n workflow and supports, as applicable:

- Employee requests.
- Operational tasks.
- Assignment.
- Approval workflows.
- Status tracking.
- Due dates.
- Attachments.
- Activity history.
- Notifications.
- Operational dashboard/reporting.

The exact entities and fields must be finalized from the existing Office Automation spreadsheet and n8n workflows before migration implementation.

### 3.4 Out of Scope

- Multi-tenancy.
- Native mobile apps.
- AI/OCR/summarization.
- E-signature.
- Full ERP/accounting/payroll.
- Complex BPMN workflow designer.
- WhatsApp/SMS integrations.
- Public self-registration.
- Replacing n8n as the integration platform.

---

## 4. Users and Access

### SUPERUSER

- Manage users.
- Manage module access.
- Manage roles/permissions.
- Access authorized modules and administration.
- Configure settings/integrations.
- Access audit logs.

### EDITOR

- Create/edit permitted documents.
- Upload files.
- Configure reminders.
- Manage permitted Office Automation records.
- Process assigned operational tasks.
- Perform permitted approval actions.

### VIEWER

- View authorized dashboards and records.
- Search/filter.
- View permitted reports/details.
- No mutation unless explicitly granted.

### EMPLOYEE

Employee access is a business capability, not a separate authentication system. An employee uses the same platform account and can be granted Office Automation permissions such as:

- View personal dashboard.
- Create permitted requests.
- View own requests.
- View/update assigned tasks where permitted.
- Receive Telegram notifications.
- View request/approval status.

---

## 5. Authentication and Authorization

The platform uses one centralized identity system:

```text
User
├── Identity
├── Global Role
│   ├── SUPERUSER
│   ├── EDITOR
│   └── VIEWER
└── Module Access
    ├── Contract & Document
    └── Office Automation
```

Existing users must never be forced to register again for another module.

Module permissions are extensible. Initial Office Automation examples:

```text
OFFICE_DASHBOARD_VIEW
OFFICE_REQUEST_VIEW
OFFICE_REQUEST_CREATE
OFFICE_REQUEST_EDIT
OFFICE_TASK_VIEW
OFFICE_TASK_UPDATE
OFFICE_TASK_ASSIGN
OFFICE_APPROVAL_VIEW
OFFICE_APPROVAL_ACTION
OFFICE_REPORT_VIEW
```

Authorization is enforced server-side.

---

## 6. Information Architecture

```text
Application
├── Overview
├── Contract & Documents
│   ├── All Documents
│   ├── Expiring Soon
│   ├── Expired
│   └── Archived
├── Office Automation
│   ├── Dashboard
│   ├── My Requests
│   ├── Tasks
│   ├── Approvals
│   └── Reports
└── Administration
    ├── Users
    ├── Roles & Access
    ├── Audit Log
    ├── Integrations
    └── Settings
```

Navigation is permission-aware.

---

## 7. Office Automation Workflow

Baseline workflow:

```text
Employee
   ↓
Create Request
   ↓
PostgreSQL
   ↓
Workflow / Approval
   ↓
Manager / Responsible User
   ↓
Approve / Reject / Process
   ↓
PostgreSQL
   ↓
Notification Event
   ↓
n8n
   ↓
Telegram
```

### Request

Must support, as applicable:

- Request number.
- Request type.
- Requester.
- Department/team.
- Description.
- Priority.
- Submitted date.
- Required date.
- Status.
- Assignee.
- Approval status.
- Attachments.
- Created/updated timestamps.

### Task

Must support, as applicable:

- Title.
- Description.
- Request reference.
- Assignee.
- Priority.
- Due date.
- Status.
- Completion date.
- Activity history.

### Approval

Must support:

- Request reference.
- Approver.
- Status.
- Decision timestamp.
- Decision/comment.
- Audit trail.

Baseline states:

```text
PENDING
APPROVED
REJECTED
CANCELLED
```

---

## 8. Legacy Migration

The previous operational flow was:

```text
Employee → Google Spreadsheet → n8n → Notification/Workflow
```

The new flow is:

```text
Employee → Next.js → NestJS → PostgreSQL → Business Logic
                                      ↓
                                    n8n → Telegram
```

Do **not** perform a blind spreadsheet-to-table conversion. First inventory:

- Sheets and columns.
- Data types.
- Relationships.
- Formula-derived values.
- Status mappings.
- Employee references.
- Approval relationships.
- n8n dependencies.
- Notification rules.

Migration stages:

```text
Inventory Spreadsheet
        ↓
Inventory n8n workflows
        ↓
Map business processes
        ↓
Design PostgreSQL schema
        ↓
Build migration script
        ↓
Import data
        ↓
Validate counts/relationships
        ↓
Switch application to PostgreSQL
        ↓
Spreadsheet becomes read-only/archive
```

Google Spreadsheet is not a production source of truth after cutover.

Migration reports must identify `Imported`, `Skipped`, `Invalid`, `Duplicate`, and `Needs Review` records.

---

## 9. n8n and Telegram Integration

n8n remains explicitly supported.

### n8n responsibilities

- Telegram integration.
- External service integration.
- Appropriate workflow orchestration.
- Notification delivery workflows.
- Future integrations.

n8n is **not** the primary application database.

Preferred event pattern:

```text
NestJS
  ↓
Business Event
  ↓
Integration Outbox
  ↓
n8n Webhook
  ↓
Telegram / External Service
```

Examples:

```text
DOCUMENT_EXPIRING
DOCUMENT_EXPIRED
OFFICE_REQUEST_CREATED
OFFICE_APPROVAL_REQUIRED
OFFICE_REQUEST_APPROVED
OFFICE_REQUEST_REJECTED
OFFICE_TASK_OVERDUE
```

Integration endpoints require authentication. Secrets are stored outside source control.

If n8n or Telegram is unavailable, the business transaction must remain committed in PostgreSQL and the integration event must be retryable.

---

## 10. Integration Event / Outbox

The platform should use a transactional outbox pattern:

```text
Business transaction
       ↓
PostgreSQL transaction
       ↓
Outbox / integration event
       ↓
Integration worker
       ↓
n8n
       ↓
Telegram
```

Example event:

```json
{
  "event": "OFFICE_APPROVAL_REQUIRED",
  "event_id": "uuid",
  "entity_id": "uuid",
  "created_at": "timestamp",
  "payload": {}
}
```

Events must be idempotent and observable. Failed events must be retryable and auditable.

---

## 11. Database Architecture

PostgreSQL is the single source of truth.

### Platform tables

```text
users
roles
permissions
user_roles
module_access
audit_logs
notifications
notification_templates
integration_events
system_settings
```

### Contract & Document tables

```text
documents
document_reminders
```

### Office Automation baseline tables

```text
office_requests
office_tasks
office_approvals
office_request_attachments
office_activity_logs
```

Final Office Automation schema must be based on the legacy workflow discovery.

Design principles:

- UUID primary keys.
- Foreign-key integrity.
- Proper indexes.
- Migration-based schema management.
- JSONB only where flexible metadata is justified.
- Timestamps on mutable entities.
- Archive/soft-state where appropriate.
- Audit important mutations.

---

## 12. Dashboard and UX

The product retains the **Premium Business Command Center** direction.

### Employee dashboard

- My pending requests.
- My active tasks.
- Requests awaiting approval.
- Upcoming deadlines.
- Recent activity.

### Manager/operations dashboard

- Pending requests.
- Pending approvals.
- Open tasks.
- Overdue tasks.
- Team workload.
- Recent activity.

### Superuser dashboard

- User/module visibility.
- Operational overview.
- Integration health.
- Audit activity.

The Office Automation module must use the same design system, responsive behavior, light/dark themes, accessibility standards, and loading/empty/error states as Contract & Document.

---

## 13. Notification Architecture

Notifications are a shared platform capability:

```text
Business Module
      ↓
Notification/Event Layer
      ↓
Integration
 ┌────┴─────┐
Email      n8n → Telegram
```

Business logic must not be coupled directly to Telegram-specific implementation.

---

## 14. API

Base path: `/api/v1`

### Auth

```text
POST /auth/login
POST /auth/logout
GET  /auth/me
```

### Users

```text
GET    /users
POST   /users
GET    /users/:id
PATCH  /users/:id
```

### Module Access

```text
GET   /users/:id/modules
PATCH /users/:id/modules
```

### Office Automation

```text
GET    /office/requests
POST   /office/requests
GET    /office/requests/:id
PATCH  /office/requests/:id
GET    /office/tasks
GET    /office/tasks/:id
PATCH  /office/tasks/:id
GET    /office/approvals
POST   /office/approvals/:id/approve
POST   /office/approvals/:id/reject
GET    /office/dashboard
```

### Contract & Document

Existing document, reminder, dashboard, and audit APIs remain in scope.

All backend APIs must be documented with Swagger/OpenAPI.

---

## 15. Security

- Argon2id password hashing.
- JWT expiration.
- Server-side authorization.
- Module permission enforcement.
- DTO validation.
- File type/size validation.
- Secure downloads.
- Explicit CORS.
- Rate limiting for authentication.
- Environment-based secrets.
- No credentials in source control.
- Authenticated n8n integration.
- No direct database access from frontend.
- Audit important mutations.

---

## 16. Audit

Audit both platform and business modules.

Examples:

```text
USER_CREATED
USER_ROLE_CHANGED
MODULE_ACCESS_CHANGED
DOCUMENT_CREATED
DOCUMENT_UPDATED
DOCUMENT_ARCHIVED
DOCUMENT_FILE_UPLOADED
OFFICE_REQUEST_CREATED
OFFICE_REQUEST_UPDATED
OFFICE_REQUEST_APPROVED
OFFICE_REQUEST_REJECTED
OFFICE_TASK_ASSIGNED
OFFICE_TASK_UPDATED
INTEGRATION_EVENT_CREATED
INTEGRATION_EVENT_FAILED
INTEGRATION_EVENT_RETRIED
```

Sensitive credentials must never be stored in audit metadata.

---

## 17. Testing

### Platform

- Authentication.
- RBAC.
- Module access.
- Permission enforcement.
- User activation/deactivation.
- Audit logging.

### Office Automation

- Request creation/update.
- Employee access boundaries.
- Task assignment/update.
- Approval/rejection.
- Status transitions.
- Audit history.

### Integration

Test successful delivery and failure cases:

```text
Request Created
 ↓
PostgreSQL Transaction
 ↓
Integration Event
 ↓
n8n
 ↓
Telegram
```

Also test n8n unavailable, retries, duplicate events, Telegram failure, and successful retry.

---

## 18. Deployment Architecture

```text
Internet
   ↓
Next.js
   ↓
NestJS API
   ├── PostgreSQL
   ├── S3 Storage
   ├── Scheduler/Worker
   └── Integration Outbox
             ↓
            n8n
             ↓
          Telegram
```

Docker and Docker Compose remain the preferred local/staging deployment model.

---

## 19. Repository Structure

```text
business-operations-platform/
├── frontend/
│   ├── app/
│   │   ├── dashboard/
│   │   ├── documents/
│   │   ├── office/
│   │   └── administration/
│   ├── components/
│   ├── lib/
│   └── styles/
├── backend/
│   └── src/
│       ├── auth/
│       ├── users/
│       ├── rbac/
│       ├── modules/
│       ├── audit/
│       ├── storage/
│       ├── notifications/
│       ├── integrations/
│       ├── scheduler/
│       ├── dashboard/
│       ├── documents/
│       └── office/
├── docs/
│   ├── PRD.md
│   ├── ERD.md
│   ├── API.md
│   ├── MIGRATION.md
│   └── N8N-INTEGRATION.md
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## 20. Implementation Phases

### Phase 0 — Legacy Discovery

1. Inventory Office Automation spreadsheet.
2. Inventory sheets/columns and relationships.
3. Inventory n8n workflows.
4. Map current workflows.
5. Identify approval and notification flows.
6. Define migration mapping.

### Phase 1 — Platform Foundation

1. Shared authentication.
2. Users.
3. RBAC.
4. Module access.
5. Permissions.
6. Audit.
7. PostgreSQL/Prisma.
8. Integration event/outbox foundation.
9. n8n integration foundation.

### Phase 2 — Contract & Document

Continue the existing vertical slice:

`Login → Dashboard → Create Document → Upload → Document List → Document Detail → Expiry → Reminder`

### Phase 3 — Office Automation Migration

1. PostgreSQL schema.
2. Migration scripts.
3. Legacy data import.
4. Employee access.
5. Request workflow.
6. Task workflow.
7. Approval workflow.
8. Office dashboard.
9. Audit.

### Phase 4 — n8n + Telegram

1. Integration event processing.
2. n8n webhook integration.
3. Telegram workflows.
4. Retry/idempotency.
5. Integration monitoring.
6. Failure audit.

### Phase 5 — Product Polish

Responsive refinement, accessibility, loading/empty/error states, performance, security hardening, and production Docker build.

---

## 21. Definition of Done

### Platform

- Authentication works.
- Existing users access enabled modules without re-registration.
- SUPERUSER/EDITOR/VIEWER remain supported.
- Module access and permissions work.
- PostgreSQL is the single source of truth.
- Audit works.

### Contract & Document

The existing MVP Definition of Done remains satisfied using shared platform infrastructure.

### Office Automation

- Legacy data has been mapped.
- Required data is migrated to PostgreSQL.
- Employees use the shared account system.
- Requests work.
- Tasks work.
- Approvals work.
- Status tracking works.
- Dashboard works.
- Audit history works.

### n8n / Telegram

- n8n remains operational.
- NestJS emits authenticated integration events.
- Telegram notifications work.
- Retry works.
- Duplicate events are handled safely.
- Integration failures are observable.

### Infrastructure

- Clean database migrations work.
- Docker build works.
- Backend tests pass.
- Frontend build passes.
- Swagger is available.
- No production workflow depends on Google Spreadsheet.

---

## 22. Architecture Decision Summary

| Area | Decision |
|---|---|
| Product | Business Operations Platform |
| Tenancy | Single-tenant |
| Architecture | Modular monolith |
| Frontend | Next.js + TypeScript |
| Backend | NestJS + TypeScript |
| Database | PostgreSQL |
| ORM | Prisma |
| Storage | Existing S3-compatible infrastructure |
| API | REST |
| API Docs | Swagger/OpenAPI |
| Authentication | JWT + Argon2id |
| Global Roles | SUPERUSER / EDITOR / VIEWER |
| Access Model | Global RBAC + module-level permissions |
| Modules | Contract & Document / Office Automation |
| Notifications | Shared notification service |
| Integration | n8n |
| Messaging | Telegram via n8n |
| Scheduler | Backend scheduler/worker |
| Event Delivery | Transactional outbox/integration events |
| Audit | Shared platform capability |
| UI | Premium B2B SaaS |
| Theme | Light + Dark |
| Mobile | Responsive web |
| Google Spreadsheet | Migration source only; not production database |
| n8n | Retained for integrations/automation |
| AI | Out of scope |
| WhatsApp | Out of scope |
| Multi-tenancy | Out of scope |

---

## 23. Next Implementation Step

Before coding the Office Automation module, perform **Legacy Office Automation Discovery** and produce:

1. Legacy data inventory.
2. Workflow map.
3. PostgreSQL ERD.
4. Migration mapping.
5. n8n integration event specification.
6. Telegram notification mapping.
7. Office Automation permission matrix.
8. Employee/manager workflow specification.

After approval, implementation proceeds with the platform foundation and Office Automation migration.

---

## 24. Locked Architectural Principle

```text
                 BUSINESS OPERATIONS PLATFORM

                       Core Application
                            │
           ┌────────────────┼────────────────┐
           │                │                │
       PostgreSQL       Business Logic    Scheduler
           │                │                │
           └────────────────┼────────────────┘
                            │
                       Integration
                            │
                           n8n
                            │
                         Telegram
```

**PostgreSQL owns the data.**

**NestJS owns the business rules.**

**Next.js owns the user experience.**

**n8n owns external integrations and automation workflows.**

**Telegram is a notification/integration channel, not a system of record.**

This separation is mandatory for Version 1.1.