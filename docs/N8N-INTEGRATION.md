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

## Telegram configuration

Telegram delivery is owned by the n8n workflow. The Telegram Bot Token must be stored as an environment variable/secret in the n8n deployment and must never be committed to Git, stored in PostgreSQL, or included in the NestJS event payload.

The application may also expose these deployment variables for shared environment configuration:

- `TELEGRAM_BOT_TOKEN` — Telegram bot token; secret, never log it.
- `TELEGRAM_DEFAULT_CHAT_ID` — optional fallback chat ID; do not use it when a request has explicit recipients resolved from PostgreSQL.

Employee-specific `UserTelegramIdentity.chatId` remains the authoritative recipient mapping. If no Chat ID exists, `telegramRecipients` is empty and n8n must not attempt to send Telegram for that employee.

## Supported Office events

- `OFFICE_REQUEST_CREATED`
- `OFFICE_REQUEST_UPDATED`
- `OFFICE_REQUEST_CANCELLED`
- `OFFICE_APPROVAL_REQUIRED`
- `OFFICE_REQUEST_APPROVED`
- `OFFICE_REQUEST_REJECTED`
- `OFFICE_TASK_ASSIGNED`

## PRD v1.1 completion email

The PRD v1.1 completion workflow uses n8n credentials for its sensitive authentication values rather than `$env` expressions. The GitHub webhook is protected by an n8n Header Auth credential backed by `N8N_WEBHOOK_SECRET`, and the Resend HTTP request uses the existing n8n Bearer Auth credential backed by `RESEND_API_KEY`. The sender address is non-secret configuration and is stored directly in the workflow body.

Credential secrets must never be committed to Git or exposed in logs. `N8N_BLOCK_ENV_ACCESS_IN_NODE` is therefore not required by the PRD v1.1 completion workflow itself.

## Failure rule

A failed n8n/Telegram delivery must never roll back or delete the underlying business transaction. PostgreSQL is authoritative.
