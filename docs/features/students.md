# Students

Route: `/dashboard/students`.

## Schema

`students`:

- `full_name`, `email`, `phone`, `grade_level`, `address`, `notes`.
- `default_rate` — per-hour rate used to seed session charges; can be
  overridden per `session_students` row.
- Parent contacts (required): `parent_name`, `parent_email`, `parent_phone`.
- Alternate parent contacts (optional): `alt_parent_name`, `alt_parent_email`,
  `alt_parent_phone`.
- `archived_at timestamptz` — soft-delete. Archived students stay visible in
  historical sessions and invoices but are filtered out of pickers.

## List view

[`src/app/dashboard/students/_components/students-list.tsx`](../../src/app/dashboard/students/_components/students-list.tsx)
renders a filtered `@tanstack/react-table` with:

- Full-text search (global filter).
- Archive toggle (show / hide archived).
- CSV export via `CsvDownloadButton`.
- Row → navigates to `/dashboard/students/[id]`.

## Create / edit

[`student-dialog.tsx`](../../src/components/students/student-dialog.tsx)
uses `react-hook-form` + the `studentSchema` from
[`src/lib/schemas`](../../src/lib/schemas/index.ts). Form fields use the
shared `TextField` / `TextareaField` helpers from
[`src/components/shared/form-fields.tsx`](../../src/components/shared/form-fields.tsx).

Submit calls `createStudentAction` / `updateStudentAction` in
[`src/lib/actions/students.ts`](../../src/lib/actions/students.ts), which
revalidate `/dashboard/students` and `/dashboard/students/[id]`.

## Detail page

`/dashboard/students/[id]` shows:

- Profile card (contacts, rate, grade, notes).
- **Balances** — reads `student_balances` view (`prepaid_balance`,
  `outstanding_balance`, `total_spent`).
- **Sessions** — recent sessions the student attended.
- **Invoices** — issued invoices with status + quick actions
  ("Record payment", "Download PDF").
- **Payments** — top-ups and invoice allocations.

## Archive

The archive action on the dialog / row writes `archived_at = now()` rather
than deleting, preserving referential integrity with sessions, invoices, and
payments.
