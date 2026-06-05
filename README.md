# Mozambique Procurement SaaS — Complete MVP

A working full-stack procurement, supplier selection, contract generation, AI contract extraction, and invoice generation SaaS for **Instituto de Formação de Professores de Inhamizua**.

This repository replaces the earlier placeholder skeleton with a launchable MVP that can run locally with Docker/PostgreSQL and can also be connected to a Supabase PostgreSQL database.

## What is included

- Express + TypeScript backend API
- React + TypeScript frontend dashboard
- PostgreSQL/Supabase SQL schema
- JWT authentication and role-based user model
- Supplier registry
- Tender and bid management
- Evaluation scoring support
- Contract generation
- Invoice generation with 17% VAT calculation
- AI contract/document extraction endpoint using OpenAI when an API key is configured
- Deterministic demo extraction when no OpenAI key is configured
- Audit log table and reporting endpoints
- Docker Compose for local testing
- Seed data and setup documentation

## Quick start

```bash
cp .env.example .env
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Open:

- Frontend: http://localhost:3000
- API health: http://localhost:3001/api/health

Demo login:

```text
admin@procurement.mz
admin123
```

## Docker quick start

```bash
cp .env.example .env
docker compose up --build
```

The backend container seeds demo users automatically, then open http://localhost:3000.

## Supabase setup

1. Create a Supabase project.
2. Copy the connection string from Supabase Database Settings.
3. Put it in `.env` as `DATABASE_URL`.
4. Run:

```bash
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

The SQL migration is also available at `database/001_schema.sql` for manual execution inside Supabase SQL Editor.

## OpenAI setup

The AI extraction endpoint works in two modes:

- With `OPENAI_API_KEY`: calls OpenAI's Responses API.
- Without `OPENAI_API_KEY`: returns a safe deterministic demo extraction for testing.

Configure:

```bash
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4.1-mini
```

## Main modules

| Module | Status |
|---|---:|
| Login/Auth | Working |
| Dashboard | Working |
| Suppliers | Working |
| Tenders | Working |
| Bids | Working |
| Contracts | Working |
| Invoices | Working |
| AI Extraction | Working |
| Reports | Working |
| Audit Logs | Schema + backend logging helper |

## Production checklist

Before public launch:

1. Replace `JWT_SECRET` with a strong secret.
2. Use Supabase pooled Postgres or managed PostgreSQL.
3. Enable HTTPS on the deployment platform.
4. Add legal review for final Mozambique procurement-law wording.
5. Configure storage for uploaded PDF files.
6. Add backup policy and monitoring.
7. Add formal QA tests for each procurement workflow.

## Repository structure

```text
backend/        Express API
frontend/       React app
database/       PostgreSQL/Supabase migration and seed SQL
docs/           launch and API docs
```
