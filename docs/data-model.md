# Data model

The authoritative source is [`schema.sql`](../schema.sql). This document is a
narrative map of the tables, views, RPCs, and RLS idioms.

## Multi-tenancy pattern

- `organizations(id, name, owner_id → auth.users)` — one per signed-up owner.
- Every other tenant-owned table has `organization_id` and an RLS policy:

  ```sql
  USING (organization_id IN (
    SELECT id FROM organizations WHERE owner_id = auth.uid()
  ))
  ```

- The `organizations.owner_id` column is `UNIQUE`, so a user owns exactly one
  org. The owner receives notifications (see `org_owner(p_org)` helper).

## Core tables

| Table                 | Purpose                                                            |
| --------------------- | ------------------------------------------------------------------ |
| `organizations`       | Tenant root; `owner_id` is the Supabase auth user.                 |
| `students`            | Learner profile + parent contacts + `default_rate`.                |
| `tutors`              | Tutor profile + `pay_rate` + emergency contacts + optional TFN.    |
| `sessions`            | Scheduled lesson: tutor + start/end + status + notes.              |
| `session_students`    | M-N join; per-student rate override + attendance trigger source.   |
| `attendance`          | Per (session, student) status: present / absent / late / excused. |
| `availabilities`      | Tutor availability windows used by the overlap-finder.             |
| `session_series`      | Recurrence metadata for generated session batches.                 |
| `resources`           | Shared library entries (title, URL, tags).                         |
| `session_resources`   | Many-to-many link between sessions and resources.                  |
| `payments`            | Money in, per student.                                             |
| `expenses`            | Money out.                                                         |
| `invoices`            | Issued invoices with `total`, `balance`, `status`, optional PDF.   |
| `invoice_payments`    | Links `payments` to `invoices` (partial allocation supported).     |
| `invoice_sequences`   | Per-org running counter for `INV-0001` style numbers.              |
| `invitations`         | Pending org invite tokens.                                          |
| `email_drafts`        | AI-generated drafts with lifecycle (draft → queued → sent).        |
| `notifications`       | In-app bell notifications (recipient_id = auth.users.id).          |

See §1–§21 of `schema.sql` for the exact columns and constraints.

## Views

- **`student_balances`** — rolls up payments, invoices, and sessions to
  produce `prepaid_balance`, `outstanding_balance`, and `total_spent` for the
  student-detail view and the prepaid-low notification trigger.

## RPCs (Postgres functions)

| RPC                                   | Notes                                                                               |
| ------------------------------------- | ----------------------------------------------------------------------------------- |
| `create_session_with_students(...)`   | Transactional insert + `session_students` + attendance rows.                        |
| `update_session_with_students(...)`   | Transactional update that reconciles the student list and rates.                    |
| `create_recurring_sessions(...)`      | `SECURITY DEFINER`; tenant-scope checked inside.                                    |
| `next_invoice_number(p_org)`          | Atomically increments `invoice_sequences` and returns `INV-0001`.                   |
| `sweep_overdue_invoices()`            | `SECURITY INVOKER`; marks overdue + emits `invoice_overdue` notifications.          |
| `org_owner(p_org)`                    | Helper returning the `owner_id` for an org. Used by notification triggers.          |
| `notify_attendance_absent()`          | Trigger on `attendance` rows where `status = 'absent'`.                             |
| `notify_prepaid_low_for_student(...)` | Debounced (24h) — fires from `session_students` + `sessions.status` triggers.       |

## Exclusion constraints

`sessions` uses a `btree_gist` exclusion constraint to prevent
double-bookings of the same tutor in overlapping time ranges. Requires the
`btree_gist` extension (enabled in `schema.sql`).

## Generated types

`src/lib/database.types.ts` is generated from Supabase:

```powershell
npx supabase gen types typescript --project-id yqxogberjbvqszztpkhd --schema public |
  Out-File -Encoding utf8 src/lib/database.types.ts
```

`src/lib/db-types.ts` re-exports the shapes the app consumes
(`NotificationRow`, `StudentRow`, etc.) with friendlier names.
