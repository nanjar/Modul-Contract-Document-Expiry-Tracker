# Version 1.1 ERD

PostgreSQL is the system of record.

## Platform

- `User` 1:N `UserModuleAccess`
- `User` 1:N `UserTelegramIdentity`
- `User` 1:N `AuditLog`

## Contract & Document

- `User` 1:N `Document` as owner/creator
- `Document` 1:N `Reminder`

## Office Automation

- `User` 1:N `OfficeRequest` as requester
- `OfficeRequest` 1:N `OfficeTask`
- `OfficeRequest` 1:N `OfficeApproval`
- `OfficeRequest` 1:N `OfficeActivityLog`
- `User` 1:N `OfficeTask` as assignee
- `User` 1:N `OfficeApproval` as approver

## Integration

- `IntegrationEvent` is an outbox entity and is intentionally not a business foreign-key table.
- Every event has a unique `idempotencyKey`.
- Delivery state is `PENDING -> PROCESSING -> DELIVERED` or `FAILED`.

## Notification identity

`UserTelegramIdentity.chatId` is unique. Telegram delivery is performed by n8n; PostgreSQL remains authoritative for the identity mapping.
