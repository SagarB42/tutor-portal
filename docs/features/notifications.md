# In-app notifications

A bell icon in the top bar surfaces events without requiring email.

## Schema

`notifications`:

- `id uuid`, `recipient_id uuid → auth.users`,
- `organization_id uuid → organizations`,
- `type text` — `attendance_absent | prepaid_low | invoice_overdue | generic`,
- `title text`, `body text`, `link text` (optional target URL),
- `metadata jsonb` (free-form),
- `read_at timestamptz`,
- `created_at timestamptz default now()`.

RLS: `USING (recipient_id = auth.uid())` for select / update / delete.

## Producers

- **Postgres triggers**:
  - `notify_attendance_absent` on `attendance` insert/update.
  - `notify_prepaid_low_for_student` on `session_students` + `sessions.status`
    (24h deduplication via an `EXISTS` check on the last `prepaid_low`
    notification for the same student).
- **RPC sweep**: `sweep_overdue_invoices()` fires from the dashboard layout
  once per render.
- **Manual**: the `createNotification` server action (used for future ad-hoc
  notifications).

## Consumer

[`src/components/notifications/notification-bell.tsx`](../../src/components/notifications/notification-bell.tsx)
is a client component that:

1. Takes initial `items` + `unread` count from RSC (hydrated on load).
2. Subscribes to `postgres_changes` INSERT on `notifications` filtered by
   `recipient_id=eq.${userId}`.
3. Shows a `sonner` toast for each new row, prepends it to state, bumps the
   unread badge.
4. Exposes per-row "mark read" and "delete" actions with optimistic updates.

## Queries and actions

- [`src/lib/queries/notifications.ts`](../../src/lib/queries/notifications.ts)
  — `listNotifications(limit = 30)`, `countUnreadNotifications()`,
  `sweepOverdueInvoices()`.
- [`src/lib/actions/notifications.ts`](../../src/lib/actions/notifications.ts)
  — `markNotificationReadAction`, `markAllNotificationsReadAction`,
  `deleteNotificationAction`.

## Enabling real-time

In the Supabase dashboard enable **Realtime → `public.notifications`**, or
run:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
```
