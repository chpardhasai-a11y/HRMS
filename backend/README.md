# HRMS Backend

Nest.js API for the HRMS employee core.

## Local Setup

1. Install dependencies:
   ```bash
   npm install
   npm --prefix backend install
   ```
2. Start PostgreSQL on local port `5433`:
   ```bash
   npm run db:up
   ```
3. Copy `backend/.env.example` to `backend/.env`, then run migrations and seed:
   ```bash
   npm --prefix backend run prisma:deploy
   npm run db:seed
   ```
4. Start the API and frontend in separate terminals:
   ```bash
   npm run dev:backend
   npm run dev
   ```

Demo login used by the frontend API helper:

- Email: `admin@nw18.com`
- Password: `Password@123`

Organization admin login: `hr@nw18.com` with the same demo password.

Apply saved migrations with `npm --prefix backend run prisma:deploy` before
starting the backend on a new database or after updating the application.
Use `npm run db:migrate` when creating a new migration during development.
Run the demo seed only for local/demo setup; it resets demo account passwords.

## Main Routes

- `POST /auth/login`
- `GET /auth/me`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `GET /companies`
- `GET /companies/current`
- `POST /companies`
- `PATCH /companies/:id`
- `GET /employees`
- `POST /employees`
- `GET /employees/:code`
- `PATCH /employees/:code`
- `PATCH /employees/:code/status`
- `PATCH /employees/:code/manager`
- `PATCH /employees/:code/transfer`
- `PATCH /employees/:code/documents`
- `GET /employees/:code/audit`
- `GET /lookups/departments`
- `GET /lookups/locations`
- `GET /lookups/grades`
- `GET /health`

Employee, profile, document and audit APIs are company-scoped through the authenticated user's `companyId`.

## Generic workflow platform

The replacement workflow builder, durable worker, API contracts, HR cutover behavior, private uploads, and verification steps are documented in [workflow-platform.md](../docs/workflow-platform.md). Run the API and workflow worker as separate processes. The migration `20261020000000_generic_workflow_platform` intentionally deletes legacy workflow data while preserving HR business records.
