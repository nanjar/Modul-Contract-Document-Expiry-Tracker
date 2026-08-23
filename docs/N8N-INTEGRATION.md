# n8n Integration — Version 1.1

## Contract

NestJS writes business transactions and `IntegrationEvent` rows in the same PostgreSQL transaction. A backend scheduler claims pending events and sends them to n8n.

Webhook URL is configured with `N8N_WEBHOOK_URL` and authenticated with `N8N_WEBHOOK_SECRET` using `X-Contract-Tracker-Secret`.

## Event envelope

```json
{
  "event": "OFFICE_REQUEST_CREATED",
  "entityId": "uuid",
  "payload": {
    "requesterId": "uuid",
    "telegramRecipients": [
      {
        "userId": "uuid",
        "chatId": "123456789",
        "username": "employee",
        "isVerified": true
      }
    ]
  },
  "idempotencyKey": "office-request-created:uuid"
}
```

`telegramRecipients` is resolved by NestJS at delivery time from `UserTelegramIdentity` in PostgreSQL. n8n does not need direct database access.

## Delivery semantics

1. `PENDING` event is atomically claimed as `PROCESSING`.
2. Attempt counter is incremented.
3. NestJS resolves current Telegram recipients from PostgreSQL.
4. n8n is called with the authenticated event envelope.
5. Success becomes `DELIVERED`.
6. Failure returns to `PENDING` with exponential backoff.
7. After five attempts the event becomes `FAILED` and keeps the error for observability.

## Telegram

n8n remains responsible for Telegram delivery. The application stores `UserTelegramIdentity.chatId` and does not embed Telegram business logic in the Office Automation module.

When a user has a Chat ID in PostgreSQL, the integration event contains that recipient. If no Chat ID exists, `telegramRecipients` is empty and n8n must not attempt to send a Telegram message for that user.

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
