# Tutor Portal — Documentation

Tutor Portal is a multi-tenant web app for tutoring businesses. It handles
students, tutors, sessions, attendance, invoicing, payments, expenses,
analytics, shared resources, and AI-assisted email drafting — all backed by
Supabase with strict row-level security.

## Contents

1. [Architecture](architecture.md) — stack, runtime shape, data flow.
2. [Data model](data-model.md) — tables, views, RPCs, RLS patterns.
3. Features
   - [Authentication & invites](features/auth.md)
   - [Students](features/students.md)
   - [Tutors](features/tutors.md)
   - [Scheduling & calendar](features/scheduling.md)
   - [Attendance](features/attendance.md)
   - [Invoicing](features/invoicing.md)
   - [Finance (payments & expenses)](features/finance.md)
   - [Analytics](features/analytics.md)
   - [AI emails](features/emails.md)
   - [In-app notifications](features/notifications.md)
   - [Resources library](features/resources.md)
4. [Development](development.md) — setup, scripts, conventions.
5. [Deployment](deployment.md) — Supabase + Vercel checklist.
6. [Security](security.md) — RLS, multi-tenancy guarantees, threat model.

## High-level glance

- **Runtime**: Next.js 15 App Router (RSC-first), React 19, TypeScript strict.
- **Data**: PostgreSQL via Supabase (`@supabase/ssr`), `@supabase/supabase-js`.
- **Auth**: Supabase Auth (email OTP + magic links), invitation flow.
- **UI**: Tailwind v4, Radix primitives, `lucide-react`, `sonner`, `next-themes`.
- **Server actions** for every mutation; no REST for internal writes.
- **AI**: Vercel AI SDK + OpenAI (`gpt-4o-mini`) — structured `streamObject`.
- **Email delivery**: Resend.
- **PDF**: `@react-pdf/renderer` for invoices.

## Folder layout (top level)

```
src/
  app/              Next.js routes (dashboard + auth + api)
  components/       UI + feature components
  lib/
    actions/        Server actions (mutations)
    queries/        Server-side data reads
    schemas/        Zod validation schemas (shared)
    supabase/       SSR + browser + middleware clients
    pdf/            Invoice PDF renderer
    database.types.ts  Generated from Supabase
schema.sql          Full DB schema (idempotent)
seed.sql            Local demo data
```
