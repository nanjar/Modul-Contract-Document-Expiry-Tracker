# PRD v1.1 Completion Email

The repository now contains a GitHub Actions notification gate and an importable n8n workflow template.

## GitHub configuration

Add these repository Actions secrets:

- `N8N_PRD_COMPLETION_WEBHOOK_URL` — the production n8n webhook URL for the completion workflow.
- `N8N_WEBHOOK_SECRET` — the shared secret expected by the webhook.

The GitHub workflow sends `PRD_V1_1_COMPLETE` only when the `CI` workflow on `main` completes successfully. It also sends an idempotency key derived from the successful commit SHA.

## n8n configuration

Import `prd-v1-1-completion-email.workflow.json` into the n8n instance.

Configure the Email Send node with the SMTP credential used by your n8n installation. Set these n8n environment variables:

```env
N8N_WEBHOOK_SECRET=your-shared-webhook-secret
PRD_COMPLETION_FROM_EMAIL=your-verified-sender@example.com
```

The workflow validates the `X-Contract-Tracker-Secret` header against `N8N_WEBHOOK_SECRET` before accepting the completion event. Unauthorized requests receive HTTP 401; malformed completion events receive HTTP 400.

Activate the workflow and use its production webhook URL as the GitHub secret `N8N_PRD_COMPLETION_WEBHOOK_URL`.

The workflow only accepts the `PRD_V1_1_COMPLETE` event and the requested recipient `nanjar.budiman@gmail.com`.

## Security

No SMTP password, Telegram bot token, GitHub token, or n8n secret is committed to the repository. The GitHub Action reads its n8n secret from GitHub Actions Secrets. Email credentials remain in n8n credentials/environment.

## Important completion gate

This notification is deliberately tied to a successful `CI` run. The email should be treated as an automated CI completion notice, not as proof of manual acceptance testing. The final PRD v1.1 acceptance checklist must still be completed before production sign-off.
