# Scheduling & calendar

## Routes

- `/dashboard/sessions` — flat list, CSV export, inline filters.
- `/dashboard/sessions/[id]` — detail with attendance editor + linked resources.
- `/dashboard/calendar` — month/week grid with overlap finder.

## Session lifecycle

Statuses: `scheduled → completed | canceled | no_show`. Completing a session
triggers the attendance rows to be usable by invoicing and the prepaid-low
notification sweep.

## Creation

[`session-dialog.tsx`](../../src/components/sessions/session-dialog.tsx) uses
`react-hook-form` + a Zod schema from
[`src/lib/schemas`](../../src/lib/schemas/index.ts). Submit calls the
`createSessionWithStudentsAction` / `updateSessionWithStudentsAction` server
action in [`src/lib/actions/sessions.ts`](../../src/lib/actions/sessions.ts),
which delegates to the `create_session_with_students` / `update_...` RPC.

## Recurring sessions

The recurring dialog collects:

- tutor, student(s), day-of-week, start/end times,
- rate overrides, weeks to repeat, notes.

The RPC `create_recurring_sessions(...)` (SECURITY DEFINER, with explicit
tenant-scope checks inside) generates a row per occurrence and links them via
`session_series`. Conflicts (tutor already booked) are rejected by the
exclusion constraint on `sessions`.

## Overlap finder

The calendar view includes
[`overlap-finder-dialog.tsx`](../../src/app/dashboard/calendar/_components/overlap-finder-dialog.tsx),
which reads `availabilities` + `sessions` and computes common free windows
for a selected tutor + students over a picked day range.

## Double-booking prevention

`sessions` has a `btree_gist` exclusion constraint preventing overlapping
time ranges for the same tutor. The `create_session_with_students` RPC
catches `23P01` violations and returns a friendly error the dialog surfaces
via `sonner`.
