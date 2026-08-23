# Version 1.1 API

Base URL: `/api/v1`

## Authentication

- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`

## Users / module access

- `GET /users`
- `POST /users`
- `GET /users/:id`
- `PATCH /users/:id`
- `DELETE /users/:id`
- `GET /users/:id/modules`
- `PATCH /users/:id/modules`

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

All protected endpoints require JWT authentication. Office endpoints also enforce `OFFICE_AUTOMATION` module permissions server-side.
