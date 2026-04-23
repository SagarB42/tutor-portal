# Invoicing

## Data

- `invoices` — header (number, student_id, issued_at, due_at, total, balance, status, pdf_path).
- `invoice_payments` — allocates `payments` rows to invoices (partial allocations allowed).
- `invoice_sequences` — per-org counter; `next_invoice_number(p_org)` atomically returns the next `INV-0001` style string.

## Generation flow

1. User opens the **Generate invoice** dialog from the student-detail or
   finance page.
2. Client calls the `createInvoiceAction` server action.
3. Action:
   - Reads unbilled completed sessions for the student.
   - Computes line items + totals.
   - Inserts the invoice row and populates a new PDF via
     [`src/lib/pdf/invoice-template.tsx`](../../src/lib/pdf/invoice-template.tsx)
     (using `@react-pdf/renderer`).
   - Uploads the PDF to the `invoices` storage bucket.
4. The dialog receives the invoice id and offers a "Download PDF" action.

## Payments against invoices

The **Record payment** dialog inserts a `payments` row and one or more
`invoice_payments` rows to allocate the funds. `invoices.balance` and
`status` are kept in sync via database triggers.

## Overdue sweep

`sweep_overdue_invoices()` (SECURITY INVOKER, GRANT EXECUTE to authenticated)
marks `status = 'overdue'` for invoices past `due_at` with `balance > 0` and
emits an `invoice_overdue` notification per invoice. The dashboard layout
fires this sweep once per render (best-effort, wrapped in try/catch).

## PDF template

`src/lib/pdf/invoice-template.tsx` is a React component consumed via
`renderToBuffer` on the server. It renders:

- Org details header,
- Invoice number, issued / due dates, status pill,
- Session line items with per-student rate,
- Totals with GST-ready breakout (if GST flag is set on the org — currently
  a stub).
