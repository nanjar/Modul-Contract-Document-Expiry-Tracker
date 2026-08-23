# n8n Integration — Version 1.1

## Contract

NestJS writes business transactions and `IntegrationEvent` rows in the same PostgreSQL transaction. A backend scheduler claims pending events and sends them to n8n.

Webhook URL is configured with `N8N_WEBHOOK_URL` and authenticated with `N8N_WEBHOOK_SECRET` using `X-Contract-Tracker-Secret`.

## Event envelope

```json
{
  "event": "OFFICE_REQUEST_CREATED",
  "entityId": "uuid",
  "payload": {},
  "idempotencyKey": "office-request-created:uuid"
}
```

## Delivery semantics

1. `PENDING` event is atomically claimed as `PROCESSING`.
2. Attempt counter is incremented.
3. n8n is called.
4. Success becomes `DELIVERED`.
5. Failure returns to `PENDING` with exponential backoff.
6. After five attempts the event becomes `FAILED` and keeps the error for observability.

## Telegram

n8n remains responsible for Telegram delivery. The application stores `UserTelegramIdentity.chatId` and does not embed Telegram business logic in the Office Automation module.

The n8n workflow should resolve the target chat ID from the user identity and only send when a valid/verified chat ID exists.

## Supported Office events

- `OFFICE_REQUEST_CREATED`
- `OFFICE_REQUEST_UPDATED`
- `OFFICE_REQUEST_CANCELLED`
- `OFFICE_APPROVAL_REQUIRED`
- `OFFICE_REQUEST_APPROVED`
- `OFFICE_REQUEST_REJECTED`
- `OFFICE_TASK_ASSIGNED`

## Failure rule

A failed n8n/Telegram delivery must never roll back or delete the underlying business transaction. PostgreSQL is authoritative.
