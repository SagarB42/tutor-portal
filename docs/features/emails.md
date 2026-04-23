# AI emails

Route: `/dashboard/emails`.

## Goal

Let the owner compose parent-facing emails (progress updates, invoice
nudges, cancellation notices, etc.) with AI assistance while keeping the
owner in the loop before anything is sent.

## Flow

```
[Context loaders] ──▶ [AI draft] ──▶ [User edits] ──▶ [Send via Resend]
        │                  │              │                │
        ▼                  ▼              ▼                ▼
  students/sessions    streamObject    email_drafts     email_drafts
  balances/invoices    (OpenAI)        (draft)          (sent)
```

## Context loaders

When the user picks a template (`progress_update`, `invoice_reminder`,
`attendance_concern`, `custom`) and a student, the server pulls the relevant
context (recent sessions, balances, open invoices) via functions in
`src/lib/emails/context.ts` (structure may vary).

## Draft generation

`POST /api/emails/generate` calls `streamObject` from the Vercel AI SDK
against `@ai-sdk/openai` (`gpt-4o-mini`). The response is a structured
`{ subject, body_markdown }` object. The client renders the stream into the
compose dialog
([`compose-dialog.tsx`](../../src/app/dashboard/emails/_components/compose-dialog.tsx)).

## Drafts table

`email_drafts`:

- `status`: `draft | queued | sent | failed`.
- `template`, `subject`, `body_markdown`, `body_html`, `to`, `cc`, `bcc`.
- `sent_at`, `sent_message_id` populated by the send path.

## Sending

`POST /api/emails/send` validates the draft, converts markdown to HTML via
a small renderer, then calls the Resend SDK. The response is persisted
back onto the `email_drafts` row.

## Notes on `EMAIL_FROM`

Resend rejects free-mail domains (`gmail.com`, `outlook.com`, …) as senders.
Options:

- **Sandbox**: `EMAIL_FROM=onboarding@resend.dev`.
- **Production**: verify a domain in the Resend dashboard and use
  `EMAIL_FROM="Tutor Portal <noreply@yourdomain.com>"`.

`src/lib/env.ts` accepts the `"Display Name <addr>"` shape via
`z.string().min(1).optional()`.
