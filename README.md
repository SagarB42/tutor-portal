# Tutor Portal

A multi-tenant admin app for tutoring businesses. Tracks students, tutors,
sessions, attendance, invoicing, payments, expenses, analytics, shared
resources, AI-assisted emails, and in-app notifications — backed by Supabase
with row-level security on every tenant table.

Built with **Next.js 15 (App Router, RSC-first)**, **React 19**,
**TypeScript strict**, **Tailwind v4**, and **Supabase**.

## Quickstart

```powershell
cd tutoring/tutorPortal
npm install
# create .env.local with Supabase / OpenAI / Resend keys (see docs/development.md)
npm run dev
```

Apply the database schema by pasting [`schema.sql`](schema.sql) into the
Supabase SQL editor (idempotent — safe to re-run). Optionally load demo
data with [`seed.sql`](seed.sql).

## Scripts

- `npm run dev` — Turbopack dev server.
- `npm run build` — production build.
- `npm run start` — serve the production build.
- `npm run lint` / `npm run type-check` / `npm run format`.

## Documentation

Full documentation lives in **[`docs/`](docs/README.md)**:

- [Architecture](docs/architecture.md)
- [Data model](docs/data-model.md)
- Features: [auth](docs/features/auth.md) ·
  [students](docs/features/students.md) ·
  [tutors](docs/features/tutors.md) ·
  [scheduling](docs/features/scheduling.md) ·
  [attendance](docs/features/attendance.md) ·
  [invoicing](docs/features/invoicing.md) ·
  [finance](docs/features/finance.md) ·
  [analytics](docs/features/analytics.md) ·
  [emails](docs/features/emails.md) ·
  [notifications](docs/features/notifications.md) ·
  [resources](docs/features/resources.md)
- [Development](docs/development.md)
- [Deployment](docs/deployment.md)
- [Security](docs/security.md)

## License

Private / proprietary.
