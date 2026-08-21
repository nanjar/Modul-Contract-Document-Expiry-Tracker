# Architecture

The MVP is a single-tenant modular monolith. Platform capabilities are separated from the document module so future business modules can reuse them.

## Modules

Backend modules:

- auth
- users
- rbac
- audit
- storage
- notifications
- scheduler
- dashboard
- documents

## Request flow

```text
Browser -> Next.js -> NestJS REST -> Prisma -> PostgreSQL
                              |
                              +-> S3-compatible storage
                              +-> notification provider
                              +-> scheduler
```

## First vertical slice

1. Login and JWT authentication.
2. Role-aware application shell.
3. Dashboard summary.
4. Document creation and validation.
5. Document list/search/filter.
6. Document detail.
7. File upload through storage abstraction.

## Security boundary

Authorization is enforced in the backend. Frontend role checks only control UX visibility and are never treated as security controls.
