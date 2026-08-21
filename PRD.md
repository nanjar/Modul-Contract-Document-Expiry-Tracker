# Contract & Document Expiry Tracker

> Product Requirements Document — MVP Baseline

Version 0.1 · Status: Draft / MVP Baseline · Date: 2026-08-21

## Product Overview

Contract & Document Expiry Tracker is a single-tenant modular B2B SaaS module that helps businesses prevent important contracts, licenses, certificates, permits, insurance policies, and other documents from expiring unnoticed.

Core promise: **Don't let important documents expire unnoticed.**

## Locked MVP Decisions

| Area | Decision |
|---|---|
| Tenancy | Single-tenant |
| Frontend | Next.js + TypeScript |
| Backend | NestJS + TypeScript |
| Database | PostgreSQL |
| ORM | Prisma |
| Storage | Existing S3-compatible infrastructure |
| API | REST |
| API Docs | Swagger/OpenAPI |
| Auth | JWT + Argon2id |
| RBAC | SUPERUSER / EDITOR / VIEWER |
| Architecture | Modular monolith |
| Notifications | Provider abstraction, email first |
| Background jobs | Scheduler/worker |
| Audit | Platform capability |
| UI | Premium B2B SaaS |
| Theme | Light + dark |
| Mobile | Responsive web |
| Multi-tenancy | Out of scope |
| AI / OCR / e-signature / WhatsApp | Out of scope |

## Primary Goals

1. Register and find important business documents easily.
2. Surface upcoming expirations immediately.
3. Remind responsible users automatically before expiry.
4. Maintain reliable metadata, dates, ownership, and audit history.
5. Deliver a premium responsive B2B UX.
6. Establish reusable platform infrastructure for future modules.
7. Keep deployment and operating costs low.

## Roles

- **SUPERUSER** — users, settings, documents, audit, reminders.
- **EDITOR** — create/edit/upload documents and configure reminders.
- **VIEWER** — dashboard, search/filter, detail and authorized downloads.

## Core Screens

- Login
- Dashboard
- Documents list
- Add Document wizard
- Document Detail
- Users
- Audit Log
- Settings

## Document Status

```text
if archived:
    ARCHIVED
else if expiry_date is null:
    NO_EXPIRY
else if expiry_date < today:
    EXPIRED
else if expiry_date <= today + warning_threshold:
    EXPIRING_SOON
else:
    ACTIVE
```

Default warning threshold: 30 days, configurable.

## Reminder Defaults

90, 30, 14, 7, and 1 day before expiry. Each reminder is configurable per document and must be idempotent.

## API Surface

Base path: `/api/v1`

Auth: `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`

Users: `GET /users`, `POST /users`, `GET /users/:id`, `PATCH /users/:id`, `DELETE /users/:id`

Documents: `GET /documents`, `POST /documents`, `GET /documents/:id`, `PATCH /documents/:id`, `POST /documents/:id/file`, `GET /documents/:id/file`, `POST /documents/:id/archive`

Reminders: `GET /documents/:id/reminders`, `POST /documents/:id/reminders`, `PATCH /documents/:id/reminders/:reminderId`, `DELETE /documents/:id/reminders/:reminderId`

Dashboard: `GET /dashboard/summary`, `GET /dashboard/expiring`, `GET /dashboard/recent`

Audit: `GET /audit-logs`, `GET /audit-logs/:id`

All backend APIs are documented using Swagger/OpenAPI.

## Architecture

```text
frontend/ (Next.js)
        |
        v
backend/ (NestJS REST)
  |      |       |
  v      v       v
Postgres  S3    Scheduler/Notifications
  |
Prisma
```

## UX Direction

Working concept: **Premium Business Command Center**.

Design principles: action-oriented, simple by default, strong typography, generous whitespace, restrained semantic color, clear hierarchy, subtle borders/shadows, deliberate loading/empty/error states, responsive behavior, light and dark themes.

## Security

Argon2id password hashing, short-lived JWT access tokens, server-side RBAC, DTO validation, file type/size checks, safe filenames, authorized downloads, environment-only secrets, audit logging, explicit CORS, and rate limiting for authentication endpoints.

## Definition of Done

MVP is complete when authentication, RBAC, user management, document CRUD, S3-compatible uploads, search/filter, derived expiry status, dashboard, configurable reminders, scheduled email notification, idempotent reminder processing, audit logs, Swagger, responsive UI, light/dark themes, Docker build, clean database migration, frontend build, and backend tests all work.

## Implementation Phases

1. Product & UX foundation
2. Platform foundation
3. Document vertical slice
4. Expiry & notifications
5. Product polish and security hardening

## First Vertical Slice

**Login → Dashboard → Create Document → Upload → Document List → Document Detail**

The UI/UX is a first-class product requirement and must not be treated as post-processing.
