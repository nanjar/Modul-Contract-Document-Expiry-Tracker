# Contract & Document Expiry Tracker

Premium single-tenant B2B document expiry tracker.

## Stack

- Frontend: Next.js + TypeScript
- Backend: NestJS + TypeScript + Prisma
- Database: PostgreSQL
- API: REST + Swagger/OpenAPI
- Auth: JWT + Argon2id
- Storage: S3-compatible abstraction
- Notifications: provider abstraction with console and Resend

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

Set a strong `JWT_SECRET` and any S3/Resend variables required by the deployment, then:

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

The MVP follows the PRD: authentication, Superuser/Editor/Viewer RBAC, document CRUD, S3-compatible file storage, expiry tracking, reminders, scheduled email notifications, audit log, dashboard, responsive premium UI, Swagger, migrations, Docker, and security validation.
