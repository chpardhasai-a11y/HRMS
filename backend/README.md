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
   npm run db:migrate
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
