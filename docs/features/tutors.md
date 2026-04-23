# Tutors

Route: `/dashboard/tutors`.

## Schema

`tutors`:

- `full_name`, `email`, `phone`, `address` (all required).
- `pay_rate` — AUD per hour the tutor is paid.
- Bank details (optional): `bank_bsb`, `bank_account`.
- `tfn` (optional) — Australian Tax File Number; stored as text, no
  validation beyond presence.
- Emergency contacts: `emergency_name`, `emergency_phone` (required),
  `alt_emergency_name`, `alt_emergency_phone` (optional).
- `archived_at timestamptz` — soft-delete; archived tutors are filtered out
  of scheduling pickers but remain on historical sessions.

## List view

[`src/app/dashboard/tutors/_components/tutors-list.tsx`](../../src/app/dashboard/tutors/_components/tutors-list.tsx)
renders a `@tanstack/react-table` with search, archive toggle, and a row
click that navigates to `/dashboard/tutors/[id]`.

## Create / edit

[`tutor-dialog.tsx`](../../src/components/tutors/tutor-dialog.tsx) uses
`react-hook-form` + the `tutorSchema` from
[`src/lib/schemas`](../../src/lib/schemas/index.ts).

Submit calls `createTutorAction` / `updateTutorAction` in
[`src/lib/actions/tutors.ts`](../../src/lib/actions/tutors.ts), which
revalidate `/dashboard/tutors` and `/dashboard/tutors/[id]`.

## Detail page

`/dashboard/tutors/[id]` shows:

- Profile (contacts, address, pay rate, bank / TFN, emergency contacts).
- **Upcoming sessions** — next scheduled sessions for this tutor.
- **Recent sessions** — completed sessions with attendance summary.
- **Availability** — the windows from `availabilities` used by the
  overlap-finder on the calendar page.
- **Earnings** — hours worked × `pay_rate` for the current AU FY (1 Jul →
  30 Jun). Driven by `src/lib/fy.ts`.

## Archive

Setting `archived_at` keeps the tutor visible on past sessions and invoices
while hiding them from the scheduling pickers and availability UI.

## Sensitive data

TFN and bank details are stored in plaintext on the server and are only
returned by RLS-scoped queries to the org owner. There is no dedicated
encryption-at-rest layer beyond what Postgres / Supabase provides. Avoid
exposing these columns to any new UI without a clear need.
