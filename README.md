# Contract & Document Expiry Tracker

Premium single-tenant B2B document expiry tracker evolving into a Business Operations Platform.

## Stack

- Frontend: Next.js + TypeScript
- Backend: NestJS + TypeScript + Prisma
- Database: PostgreSQL
- API: REST + Swagger/OpenAPI
- Auth: JWT + Argon2id
- Storage: S3-compatible abstraction
- Notifications: provider abstraction with console and Resend
- Automation: n8n + Telegram

## Identity model

The platform has one shared identity system: **User = Employee**.

Employees are not registered a second time for Office Automation. The same user account can be a document owner, requester, task assignee, approver, and notification recipient according to RBAC and module permissions.

Telegram is an integration channel, not a system of record. A user can have a Telegram identity stored in PostgreSQL through `UserTelegramIdentity`. When a Chat ID exists, integration events resolve it into `telegramRecipients` before dispatching the event to n8n.

## Repository

```text
frontend/                 Next.js application
backend/                  NestJS API
backend/prisma/           Prisma schema and migrations
docs/                     Product and architecture documentation
.github/workflows/        CI
```

## WSL / Ubuntu development

Prerequisites: Node.js 22+, pnpm 10+, Docker Engine with Compose.

```bash
cd ~/projects/Modul-Contract-Document-Expiry-Tracker
cp .env.example .env
```

For local development, keep PostgreSQL in Docker:

```bash
docker compose up -d postgres
```

Backend:

```bash
cd backend
pnpm install
pnpm prisma generate
pnpm prisma migrate dev
pnpm prisma seed
pnpm start:dev
```

Frontend, in another terminal:

```bash
cd frontend
pnpm install
pnpm dev
```

Open `http://localhost:3000`.

Swagger/OpenAPI is available at `http://localhost:3001/docs`.

## Production-style Docker stack

Set a strong `JWT_SECRET` and any S3/Resend/n8n variables required by the deployment, then:

```bash
docker compose up -d --build
```

The stack exposes frontend on `3000` and backend on `3001`. The backend container runs Prisma migrations before starting the API.

## Email notifications

For development:

```env
NOTIFICATION_EMAIL_MODE=console
```

For Resend:

```env
NOTIFICATION_EMAIL_MODE=resend
RESEND_API_KEY=re_...
NOTIFICATION_FROM_EMAIL=Expiry Tracker <noreply@example.com>
```

## n8n / Telegram

Configure the backend with:

```env
N8N_WEBHOOK_URL=https://your-n8n-host/webhook/contract-tracker/office-events
N8N_WEBHOOK_SECRET=your-secret
```

Configure an employee's Telegram Chat ID from **Administration → Users & employees**. Office integration events include resolved Telegram recipients when a Chat ID is present in PostgreSQL. n8n remains responsible for Telegram delivery.

Never commit real credentials. The `.env.example` file contains placeholders only.

## Verification

Backend tests and frontend/backend builds are run by GitHub Actions on pushes and pull requests to `main`.

```bash
cd backend
pnpm test
pnpm build

cd ../frontend
pnpm build
```

## Product scope

Version 1.1 follows the Business Operations Platform PRD: shared authentication, SUPERUSER/EDITOR/VIEWER RBAC, module access, Contract & Document Expiry Tracker, Office Automation requests/tasks/approvals, audit history, transactional integration events, n8n integration, Telegram notifications, responsive premium UI, Swagger, migrations, Docker, and security validation.
