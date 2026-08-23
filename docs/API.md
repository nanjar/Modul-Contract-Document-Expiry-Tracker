# Version 1.1 API

Base URL: `/api/v1`

## Authentication

- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`

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

- `GET /office-automation/dashboard`
- `GET /office-automation/requests`
- `POST /office-automation/requests`
- `GET /office-automation/requests/:id`
- `PATCH /office-automation/requests/:id`
- `POST /office-automation/requests/:id/cancel`
- `GET /office-automation/tasks`
- `PATCH /office-automation/tasks/:id`
- `POST /office-automation/requests/:id/tasks`
- `POST /office-automation/requests/:id/approvals`
- `POST /office-automation/approvals/:id/decision`

All protected endpoints require JWT authentication. User administration and Telegram identity management require SUPERUSER. Office endpoints enforce `OFFICE_AUTOMATION` module permissions server-side.
