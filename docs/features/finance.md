# Finance (payments & expenses)

Route: `/dashboard/finance`.

## Payments

- Source of truth for money received: `payments (id, student_id, amount, method, received_at, notes)`.
- Can be entered directly (top-up) or via the **Record payment** flow from an
  invoice (which also writes `invoice_payments`).
- Dialog: [`log-payment-dialog.tsx`](../../src/components/finance/log-payment-dialog.tsx).

## Expenses

- Table: `expenses (id, category, amount, spent_at, notes)`.
- Dialog: [`log-expense-dialog.tsx`](../../src/components/finance/log-expense-dialog.tsx).

## Student balances

The `student_balances` view returns, per student:

- `prepaid_balance` — payments minus session charges (top-up model).
- `outstanding_balance` — invoice balances open.
- `total_spent`.

The finance view and student-detail page both read from this view so the
numbers match.

## Prepaid-low notification

`notify_prepaid_low_for_student(student_id)`:

- Reads `student_balances` for the student's org.
- If `prepaid_balance` < a configurable threshold (currently hardcoded at
  AUD 100) and no `prepaid_low` notification was emitted for the same student
  in the last 24h, inserts one.

Triggers that invoke it:

- After insert / delete on `session_students`.
- After update on `sessions.status`.

## CSV export

`CsvDownloadButton` ([`src/components/shared/csv-download-button.tsx`](../../src/components/shared/csv-download-button.tsx))
dumps the visible rows. Used on finance, sessions, and students pages.
