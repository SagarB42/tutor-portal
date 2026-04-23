# Authentication & invites

## Stack

- **Supabase Auth** via `@supabase/ssr`.
- Three Supabase clients:
  - [`src/lib/supabase/server.ts`](../../src/lib/supabase/server.ts) — RSC + server actions.
  - [`src/lib/supabase/client.ts`](../../src/lib/supabase/client.ts) — browser.
  - [`src/lib/supabase/middleware.ts`](../../src/lib/supabase/middleware.ts) — keeps cookies fresh.
- Root middleware (`src/middleware.ts`) runs on every request.

## Login

- Route: [`/auth/login`](../../src/app/auth/login/page.tsx).
- Flow: email + password (Supabase's built-in), no custom identity provider.
- On success the user lands on `/dashboard`. The dashboard layout asserts
  `user` is set and redirects otherwise.

## Org bootstrap

The first time a user signs in, the dashboard layout ensures a matching row
exists in `organizations` (one per user, enforced by `owner_id UNIQUE`). RLS
uses `owner_id = auth.uid()` for every tenant-owned table.

## Invitations

Endpoint: [`/invite`](../../src/app/invite/page.tsx).

1. Owner generates a token that writes a row into `invitations`.
2. Recipient opens `/invite?token=...`.
3. On accept, the invitation is marked consumed and the session is attached
   to the inviting org. (No secondary membership model — one user ↔ one org.)

## Sign-out

The dashboard sidebar exposes a server-action sign-out that calls
`supabase.auth.signOut()` and redirects to `/auth/login`.

## No client-side auth context

The app deliberately does not use a React context for auth. Server Components
read `user` from `createClient()` synchronously in each layout, and client
components never need it.
