# Deployment

Target: **Vercel** + **Supabase**. Any Node-capable host works, but this guide
assumes Vercel.

## 1. Supabase

1. Create a project. Note the `Project ref`, `URL`, and `anon` key.
2. Open **SQL Editor → New query** and paste the contents of
   [`schema.sql`](../schema.sql). Run. It is idempotent.
3. Storage: ensure the `invoices` bucket exists (created by the schema if
   using the supplied migration section). Make it **private**.
4. **Realtime**: enable it for `public.notifications`.
   ```sql
   ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
   ```
5. (Optional) Add an email SMTP provider to customise auth emails.

## 2. OpenAI

Create an API key with access to `gpt-4o-mini`.

## 3. Vercel

1. Import the repo.
2. Set env vars in **Project → Settings → Environment Variables**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `OPENAI_API_KEY`
3. Deploy.

## 4. Post-deploy checklist

- [ ] `/auth/login` reachable, login works.
- [ ] First sign-in creates an `organizations` row.
- [ ] Creating a session works.
- [ ] Recording a payment updates `student_balances`.
- [ ] Marking attendance `absent` emits a notification and the bell shows it
      in real time.
- [ ] Generating an invoice produces a PDF and attaches it.
- [ ] Email compose dialog streams a draft.
- [ ] **Open in mail app** opens the OS mail client with the draft pre-filled.

## Rollback

Schema is idempotent — re-running `schema.sql` does not drop data. For a
data rollback, restore the Supabase point-in-time backup.
