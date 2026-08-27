# Version 1.1 API

Base URL: `/api/v1`

## Authentication

- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me` — includes the authenticated user's module access.

## Users / employees / module access

`User` is the shared employee identity. Office Automation does not have a separate employee registration system.

- `GET /users`
- `POST /users`
- `GET /users/:id`
- `PATCH /users/:id`
- `DELETE /users/:id`
- `GET /users/:id/modules`
- `PATCH /users/:id/modules`
- `PATCH /users/:id/telegram`
- `DELETE /users/:id/telegram`

Telegram identity fields are stored in PostgreSQL through `UserTelegramIdentity`. Chat IDs are unique across users.

## Contract & Document

Existing document, file, reminder, dashboard and audit APIs remain active.

## Office Automation

The PRD 1.1 canonical `/office/*` paths and the existing `/office-automation/*` paths are both supported.

- `GET /office/dashboard`
- `GET /office/reports`
- `GET /office/requests`
- `POST /office/requests`
- `GET /office/requests/:id`
- `PATCH /office/requests/:id`
- `POST /office/requests/:id/cancel`
- `GET /office/tasks`
- `GET /office/tasks/:id`
- `PATCH /office/tasks/:id`
- `POST /office/requests/:id/tasks`
- `GET /office/approvals`
- `POST /office/requests/:id/approvals`
- `POST /office/approvals/:id/decision`
- `POST /office/approvals/:id/approve`
- `POST /office/approvals/:id/reject`
- `GET /office/requests/:id/attachments`
- `POST /office/requests/:id/attachments` — multipart upload
- `GET /office/attachments/:id` — signed download URL

The same endpoints are available under `/office-automation/*` for backward compatibility.

`all=true` is honored only for privileged Office users; regular users are automatically scoped to their own requests/tasks/assigned approvals.

All protected endpoints require JWT authentication. User administration and Telegram identity management require SUPERUSER. Office endpoints enforce `OFFICE_AUTOMATION` module permissions server-side.
