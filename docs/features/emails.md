# AI emails

Route: `/dashboard/emails`.

## Goal

Let the owner compose parent-facing emails (progress updates, invoice
nudges, attendance follow-ups, etc.) with AI assistance — then hand off to
their existing mail client (Gmail / Outlook / Apple Mail) so replies thread
naturally and deliverability is whatever their personal account already has.

The app does **not** send emails itself. No SMTP relay, no `EMAIL_FROM`, no
domain to verify.

## Flow

```
[Context loaders] ──▶ [AI draft] ──▶ [User edits] ──▶ [Open in mail app]
        │                  │              │                     │
        ▼                  ▼              ▼                     ▼
  students/sessions    streamObject    email_drafts         email_drafts
  balances/invoices    (OpenAI)        (draft / saved)      (sent — manual)
```

## Context loaders

When the user picks a context type (`session_summary`, `invoice_reminder`,
`attendance_absence`, `prepaid_topup`, `resource_assignment`, `marketing`,
`custom`) the server pulls the relevant context (recent sessions, balances,
open invoices) before generation.

## Draft generation

`POST /api/emails/generate` calls `streamObject` from the Vercel AI SDK
against `@ai-sdk/openai` (`gpt-4o-mini`). The response is a structured
`{ subject, body }` object. The client renders the stream into the compose
dialog
([`compose-dialog.tsx`](../../src/app/dashboard/emails/_components/compose-dialog.tsx)).

## Drafts table

`email_drafts`:

- `status`: `draft | sent | discarded`.
- `context_type`, `subject`, `body`, `to_email`, `student_id`, `context_id`.
- `sent_at` populated when the user marks the draft as sent (manually, or
  automatically when they hit **Open in mail app**).

## Hand-off to mail client

The compose dialog offers four actions on a finished draft:

1. **Copy subject** / **Copy body** — clipboard hand-off, no navigation.
2. **Save draft** — persists to `email_drafts` with `status='draft'`.
3. **Open in mail app** — builds a `mailto:` URL pre-filled with `to`,
   `subject`, and `body`, persists the draft, navigates to the URL (the OS
   opens the user's default mail app), and stamps the draft as `sent`.

### `mailto:` size limit

Most mail clients accept a `mailto:` URL up to ~2000 characters. If the
encoded body would exceed that, the dialog falls back to opening
`mailto:to?subject=...` with no body and copies the body to the clipboard
so the user can paste it in. The user gets a toast explaining what happened.

## Marking a draft sent later

`DraftRowActions` on the emails list page shows **Mark sent** and
**Discard** buttons. **Mark sent** calls `markDraftSentAction` which sets
`status='sent'` + `sent_at=now()`.

## Why no SMTP

For a single-owner admin tool, sending from a verified domain via Resend /
SES adds:

- domain verification friction,
- per-recipient sandbox restrictions,
- a deliverability story to maintain,
- another env var (`EMAIL_FROM`) and another API key (`RESEND_API_KEY`).

Owners already have a working personal mail account. The mailto hand-off
keeps history (recipients, threads, replies) where the owner expects it.
