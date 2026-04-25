# Development

## Prerequisites

- Node.js 20+ (Next.js 15 requires 18.18+ but 20 LTS is recommended).
- A Supabase project (local or hosted).
- PowerShell 5.1+ on Windows (shown throughout), bash elsewhere.

## Initial setup

```powershell
git clone <repo>
cd tutoring/tutorPortal
npm install
Copy-Item .env.example .env.local   # if .env.example is present
```

## Environment variables

See [`src/lib/env.ts`](../src/lib/env.ts). Required:

| Key                             | Scope   | Notes                                       |
| ------------------------------- | ------- | ------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | public  | Supabase project URL.                       |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public  | anon key (safe to expose).                  |
| `OPENAI_API_KEY`                | server  | Required for AI email drafting.             |

There is no SMTP / sender configuration. Emails are handed off to the
owner's mail client via `mailto:` — see [features/emails.md](features/emails.md).

## Scripts

| Command              | Purpose                                                           |
| -------------------- | ----------------------------------------------------------------- |
| `npm run dev`        | Turbopack dev server at `http://localhost:3000`.                  |
| `npm run build`      | Production build (runs `prebuild` which clears `.next`).          |
| `npm run start`      | Run the built app.                                                |
| `npm run lint`       | ESLint (Next.js config + Prettier).                               |
| `npm run type-check` | `tsc --noEmit`.                                                   |
| `npm run format`     | Prettier write.                                                   |

## Database schema

Apply the schema by pasting [`schema.sql`](../schema.sql) into the Supabase
SQL editor. It is idempotent — safe to re-run after each change.

Seed local demo data with [`seed.sql`](../seed.sql). Seeds are also
idempotent (guarded by unique keys).

## Generated types

```powershell
npx supabase gen types typescript --project-id <ref> --schema public |
  Out-File -Encoding utf8 src/lib/database.types.ts
```

## Conventions

- **Server first** — reach for RSC + server actions before client state.
- **Zod everywhere** — schemas live in `src/lib/schemas/`. Reuse them in
  both the action and the dialog.
- **CSS tokens** — use `var(--x)` **not** `hsl(var(--x))`. Tokens are
  `oklch(...)` (Tailwind v4).
- **Icons** — `lucide-react`. Give icon-only buttons an `aria-label`.
- **Toasts** — `sonner` via the `Toaster` in `app/providers.tsx`.
- **Tables** — `@tanstack/react-table` through
  [`src/components/shared/data-table.tsx`](../src/components/shared/data-table.tsx).
- **Dialogs** — every `DialogContent` must contain a `DialogTitle` and a
  `DialogDescription` (visually hidden allowed — Radix a11y).

## Editor / formatting

- Prettier config in `.prettierrc.json`.
- ESLint config in `eslint.config.mjs` (flat config).
- No pre-commit hooks — run `npm run lint` and `npm run type-check` before pushing.
