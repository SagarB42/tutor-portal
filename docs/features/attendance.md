# Attendance

Each `session_students` insert creates a matching `attendance` row (`status
= 'pending'`). The session-detail page renders one row per enrolled student
with a status `select` (pending / present / absent / late / excused) and a
notes field.

## Triggers

- `notify_attendance_absent` — when a row transitions to `status = 'absent'`,
  a `notifications` row is inserted for the org owner with type
  `attendance_absent` and a link to the session.

## UI

Implemented in
[`src/app/dashboard/sessions/[id]/_components/attendance-editor.tsx`](../../src/app/dashboard/sessions/%5Bid%5D/_components/attendance-editor.tsx)
(name may vary). Uses server actions for per-row updates; `useTransition`
gives it optimistic-feeling behaviour without a client cache.
