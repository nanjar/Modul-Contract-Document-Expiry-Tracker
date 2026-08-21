# Contract & Document Expiry Tracker

Premium single-tenant B2B document expiry tracker.

## Stack

- Frontend: Next.js + TypeScript
- Backend: NestJS + TypeScript
- Database: PostgreSQL + Prisma
- API: REST + Swagger/OpenAPI
- Auth: JWT + Argon2id
- Storage: S3-compatible abstraction (next phase)

## Development

```bash
docker compose up -d postgres
cd backend
npm install
npx prisma generate
npx prisma migrate deploy
npm run db:seed
npm run start:dev
```

In another terminal:

```bash
cd frontend
npm install
npm run dev
```

API: `http://localhost:3001/api/v1`
Swagger: `http://localhost:3001/docs`
Frontend: `http://localhost:3000`

Default development SUPERUSER:

- Email: `admin@example.com`
- Password: `ChangeMe123!`

Override with `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` before running the seed.

See `PRD.md` for the product baseline and `docs/IMPLEMENTATION.md` for implementation progress.
