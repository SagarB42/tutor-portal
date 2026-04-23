# Security

## Authentication

- Supabase Auth only. No custom password logic in the app.
- Server-side cookie handling via `@supabase/ssr` (httpOnly, SameSite=Lax).
- Middleware refreshes the session on every request.

## Authorisation — RLS

- Every tenant-owned table has RLS enabled.
- Policy template:
  ```sql
  USING (organization_id IN (
    SELECT id FROM organizations WHERE owner_id = auth.uid()
  ))
  ```
- The `organizations` table itself uses `auth.uid() = owner_id`.
- `notifications` uses `recipient_id = auth.uid()` — the notification is
  addressed to a specific user, not an org.

## Service role key

**Not used** anywhere in the app. The Next.js server talks to Supabase with
the anon key + the user's JWT, so RLS applies to every query.

## SECURITY DEFINER functions

Only `create_recurring_sessions` is `SECURITY DEFINER` (to simplify
bulk inserts inside a transaction). It explicitly asserts
`p_organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid())`
before doing anything — no privilege escalation possible.

`sweep_overdue_invoices()` is `SECURITY INVOKER` and granted to
`authenticated`; it relies on RLS to scope updates to the caller's orgs.

## Secrets hygiene

- Keep `.env.local` out of git (it is in `.gitignore`).
- Rotate `OPENAI_API_KEY` and `RESEND_API_KEY` if they are ever exposed.
- Supabase anon keys are safe in the bundle; service role keys must never
  appear on the client.

## OWASP Top 10 touch points

| Risk                           | Mitigation                                                                 |
| ------------------------------ | -------------------------------------------------------------------------- |
| Broken access control          | RLS + server actions with Zod validation.                                  |
| Cryptographic failures         | HTTPS everywhere (Vercel); Supabase Auth handles password hashing.         |
| Injection                      | All DB access goes through the typed client; no raw SQL strings from user input. |
| Insecure design                | Multi-tenancy modelled at the DB layer, not in code.                       |
| Security misconfiguration      | Env vars validated by Zod at boot; service-role key intentionally absent.  |
| Vulnerable components          | `npm audit` clean; dependencies kept minimal (Phase 10 pruning).           |
| Identification & auth failures | Delegated to Supabase Auth.                                                |
| Software integrity failures    | Lockfile-pinned deps; CI-style build via `npm run build`.                  |
| Logging & monitoring           | Use Vercel + Supabase logs (no extra stack).                               |
| SSRF                           | The only outbound calls are to OpenAI and Resend via their SDKs.           |

## Input validation

Every server action starts with `schema.parse(input)` against a Zod schema
from `src/lib/schemas/`. Invalid input throws before any DB call.

## PDF & file storage

Invoice PDFs land in a private Supabase storage bucket. Download URLs are
signed per request via a server action; no public file URLs are exposed.
