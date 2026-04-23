# Architecture

## Rendering model

Tutor Portal is built on **Next.js 15 App Router**. Pages are React Server
Components by default — they load data directly from Supabase via the server
client and stream markup. Only interactive islands (dialogs, charts, command
palette, notification bell, form inputs) are `"use client"`.

- **Server Components** → `src/app/dashboard/**/page.tsx` and
  `src/app/dashboard/**/_components/*` (non-client ones).
- **Client Components** → everything under `src/components/**/*.tsx` that has
  `"use client"` at the top, plus a few `_components/*-view.tsx` client
  wrappers that need local state.

## Request flow

```
Browser ──▶ Next.js route (RSC)
               │
               ├─ lib/supabase/server.ts   → cookie-based session
               ├─ lib/queries/*            → read data with RLS
               ├─ lib/actions/*            → mutations (server actions)
               └─ streams HTML to browser
```

- Authenticated pages call `createClient()` from
  [supabase/server.ts](../src/lib/supabase/server.ts); the middleware
  (`src/middleware.ts` via `lib/supabase/middleware.ts`) keeps cookies fresh.
- Mutations go through **server actions** in `src/lib/actions/`. Each action
  validates input with a Zod schema, performs the write, then calls
  `revalidatePath(...)` to invalidate affected routes.
- Reads live in `src/lib/queries/`. They never use service-role credentials;
  RLS handles multi-tenancy.

## State & caching

- No Redux / Zustand / TanStack Query on the client. Server Components +
  `revalidatePath` are the primary cache primitive.
- `useTransition` + `router.refresh()` / server actions drive optimistic-
  feeling UX without client-side caches.
- Real-time updates (notifications) use Supabase's `postgres_changes`
  subscription via `@supabase/supabase-js`.

## Environment & configuration

- `src/lib/env.ts` validates env vars at build + runtime with
  `@t3-oss/env-nextjs` + Zod.
- Supabase anon key is exposed to the browser; the service role key is
  **never** used by the app.

## Multi-tenancy

Every tenant-owned table has an `owner_id uuid references auth.users` and a
policy: `using (owner_id = auth.uid()) with check (owner_id = auth.uid())`.
See [security.md](security.md) and [data-model.md](data-model.md).

## Key third-party packages

| Area            | Package                                   |
| --------------- | ----------------------------------------- |
| Forms           | `react-hook-form` + `@hookform/resolvers` |
| Validation      | `zod` (v4)                                |
| Tables          | `@tanstack/react-table`                   |
| Charts          | `recharts`                                |
| PDF             | `@react-pdf/renderer`                     |
| AI              | `ai`, `@ai-sdk/openai`                    |
| Email           | `resend`                                  |
| Toasts          | `sonner`                                  |
| Command palette | `cmdk`                                    |
| Icons           | `lucide-react`                            |
| Theme           | `next-themes`                             |
