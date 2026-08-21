# Contract & Document Expiry Tracker

Premium single-tenant B2B document expiry tracker.

## Stack

- Frontend: Next.js + TypeScript + Tailwind CSS
- Backend: NestJS + TypeScript + Prisma
- Database: PostgreSQL
- API: REST + Swagger/OpenAPI
- Auth: JWT + Argon2id
- Storage: S3-compatible abstraction

## Repository

```text
frontend/   Next.js application
backend/    NestJS API
prisma/     Database schema
```

## Quick start

```bash
docker compose up -d postgres
npm install
npm run dev
```

See `docs/ARCHITECTURE.md` for the initial implementation plan.
