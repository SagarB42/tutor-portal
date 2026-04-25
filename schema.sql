-- ============================================================
-- Tutor Portal – Complete Schema Migration
-- Idempotent: safe to re-run (uses IF NOT EXISTS)
-- Run this in the Supabase SQL Editor
-- ============================================================

-- 1. Organizations (multi-tenant root)
CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_id uuid NOT NULL UNIQUE REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='organizations' AND policyname='org_owner') THEN
    CREATE POLICY "org_owner" ON public.organizations FOR ALL USING (auth.uid() = owner_id);
  END IF;
END $$;

-- 2. Students
CREATE TABLE IF NOT EXISTS public.students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  full_name text NOT NULL,
  email text,
  phone text,
  grade_level integer,
  default_rate numeric NOT NULL DEFAULT 0,
  address text,
  parent_name text NOT NULL,
  parent_email text NOT NULL,
  parent_phone text NOT NULL,
  alt_parent_name text,
  alt_parent_email text,
  alt_parent_phone text,
  notes text,
  archived_at timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='students' AND policyname='students_org') THEN
    CREATE POLICY "students_org" ON public.students FOR ALL
      USING (organization_id IN (SELECT id FROM public.organizations WHERE owner_id = auth.uid()));
  END IF;
END $$;

-- 3. Tutors
CREATE TABLE IF NOT EXISTS public.tutors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  full_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  address text NOT NULL,
  pay_rate numeric NOT NULL DEFAULT 0,
  tfn text,
  bank_bsb text,
  bank_account text,
  emergency_name text NOT NULL,
  emergency_phone text NOT NULL,
  alt_emergency_name text,
  alt_emergency_phone text,
  archived_at timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.tutors ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='tutors' AND policyname='tutors_org') THEN
    CREATE POLICY "tutors_org" ON public.tutors FOR ALL
      USING (organization_id IN (SELECT id FROM public.organizations WHERE owner_id = auth.uid()));
  END IF;
END $$;

-- 4. Sessions
CREATE TABLE IF NOT EXISTS public.sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  tutor_id uuid REFERENCES public.tutors(id),
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  topic text NOT NULL,
  notes text,
  status text NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled','completed','cancelled_billable','cancelled_free')),
  cancellation_reason text,
  tutor_pay_rate numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='sessions' AND policyname='sessions_org') THEN
    CREATE POLICY "sessions_org" ON public.sessions FOR ALL
      USING (organization_id IN (SELECT id FROM public.organizations WHERE owner_id = auth.uid()));
  END IF;
END $$;

-- 5. Session–Students junction (per-student rate override)
CREATE TABLE IF NOT EXISTS public.session_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id),
  rate numeric NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(session_id, student_id)
);
ALTER TABLE public.session_students ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='session_students' AND policyname='ss_org') THEN
    CREATE POLICY "ss_org" ON public.session_students FOR ALL
      USING (session_id IN (SELECT id FROM public.sessions WHERE organization_id IN (SELECT id FROM public.organizations WHERE owner_id = auth.uid())));
  END IF;
END $$;

-- 6. Resources
CREATE TABLE IF NOT EXISTS public.resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  title text NOT NULL,
  subject text NOT NULL,
  grade_level integer,
  url text NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='resources' AND policyname='resources_org') THEN
    CREATE POLICY "resources_org" ON public.resources FOR ALL
      USING (organization_id IN (SELECT id FROM public.organizations WHERE owner_id = auth.uid()));
  END IF;
END $$;

-- 7. Session–Resources junction (links resource to session+student)
CREATE TABLE IF NOT EXISTS public.session_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  resource_id uuid NOT NULL REFERENCES public.resources(id),
  student_id uuid REFERENCES public.students(id),
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.session_resources ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='session_resources' AND policyname='sr_org') THEN
    CREATE POLICY "sr_org" ON public.session_resources FOR ALL
      USING (session_id IN (SELECT id FROM public.sessions WHERE organization_id IN (SELECT id FROM public.organizations WHERE owner_id = auth.uid())));
  END IF;
END $$;

-- 8. Payments (income from students)
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  student_id uuid REFERENCES public.students(id),
  amount numeric NOT NULL,
  method text NOT NULL DEFAULT 'other'
    CHECK (method IN ('cash','bank_transfer','payid','card','other')),
  description text,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='payments' AND policyname='payments_org') THEN
    CREATE POLICY "payments_org" ON public.payments FOR ALL
      USING (organization_id IN (SELECT id FROM public.organizations WHERE owner_id = auth.uid()));
  END IF;
END $$;

-- 9. Expenses (business outgoing)
CREATE TABLE IF NOT EXISTS public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  amount numeric NOT NULL,
  category text NOT NULL DEFAULT 'other'
    CHECK (category IN ('materials','software','rent','travel','tutor_pay','other')),
  description text NOT NULL,
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='expenses' AND policyname='expenses_org') THEN
    CREATE POLICY "expenses_org" ON public.expenses FOR ALL
      USING (organization_id IN (SELECT id FROM public.organizations WHERE owner_id = auth.uid()));
  END IF;
END $$;

-- 10. Invitations
CREATE TABLE IF NOT EXISTS public.invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id),
  email text NOT NULL,
  business_name text NOT NULL,
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='invitations' AND policyname='invitations_org') THEN
    CREATE POLICY "invitations_org" ON public.invitations FOR ALL
      USING (organization_id IN (SELECT id FROM public.organizations WHERE owner_id = auth.uid()));
  END IF;
END $$;
-- Public read so unauthenticated visitors can validate their token
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='invitations' AND policyname='invitations_public_read') THEN
    CREATE POLICY "invitations_public_read" ON public.invitations FOR SELECT USING (true);
  END IF;
END $$;
-- Allow newly signed-up users to mark their own invite as used
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='invitations' AND policyname='invitations_self_update') THEN
    CREATE POLICY "invitations_self_update" ON public.invitations FOR UPDATE
      USING (lower(email) = lower(auth.email()));
  END IF;
END $$;

-- ============================================================
-- 11. Data integrity constraints (idempotent)
-- ============================================================

-- Positive amounts on payments and expenses
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payments_amount_positive') THEN
    ALTER TABLE public.payments ADD CONSTRAINT payments_amount_positive CHECK (amount > 0);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'expenses_amount_positive') THEN
    ALTER TABLE public.expenses ADD CONSTRAINT expenses_amount_positive CHECK (amount > 0);
  END IF;
END $$;

-- Payments must be linked to a student
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='payments'
      AND column_name='student_id' AND is_nullable='YES'
  ) AND NOT EXISTS (SELECT 1 FROM public.payments WHERE student_id IS NULL) THEN
    ALTER TABLE public.payments ALTER COLUMN student_id SET NOT NULL;
  END IF;
END $$;

-- Sessions must have a tutor (app-level enforces, DB allows null for legacy rows)
--   NOTE: we intentionally keep tutor_id nullable at the DB level to not break
--   historical data. The app prevents inserting rows without a tutor.

-- Session must have at least one student: enforced via constraint trigger so
-- it runs at statement-end and allows the 2-step insert (session then students).
CREATE OR REPLACE FUNCTION public.enforce_session_has_students()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.session_students WHERE session_id = NEW.id) THEN
    RAISE EXCEPTION 'Session % must have at least one student', NEW.id;
  END IF;
  RETURN NEW;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'sessions_require_student'
  ) THEN
    CREATE CONSTRAINT TRIGGER sessions_require_student
      AFTER INSERT ON public.sessions
      DEFERRABLE INITIALLY DEFERRED
      FOR EACH ROW EXECUTE FUNCTION public.enforce_session_has_students();
  END IF;
END $$;

-- ============================================================
-- 12. Legacy cleanup
-- ============================================================
-- Clean up artifacts from removed features (owner-as-tutor, role system).
DROP INDEX IF EXISTS public.tutors_one_owner_per_org;
DROP INDEX IF EXISTS public.tutors_auth_user_id_idx;
ALTER TABLE public.tutors DROP COLUMN IF EXISTS is_owner;
ALTER TABLE public.tutors DROP COLUMN IF EXISTS auth_user_id;

-- ============================================================
-- 13. Helpful filter indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS students_org_active_idx
  ON public.students (organization_id)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS tutors_org_active_idx
  ON public.tutors (organization_id)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS sessions_org_start_idx
  ON public.sessions (organization_id, start_time DESC);

-- ============================================================
-- 14. Session + students atomic RPCs
--     PostgREST runs each request in its own transaction. The deferred
--     `sessions_require_student` constraint trigger fires at COMMIT, so
--     a session row inserted on its own would fail. These RPCs bundle
--     the session row and its junction rows into a single transaction.
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_session_with_students(
  p_organization_id uuid,
  p_tutor_id uuid,
  p_start_time timestamptz,
  p_end_time timestamptz,
  p_topic text,
  p_status text,
  p_notes text,
  p_cancellation_reason text,
  p_tutor_pay_rate numeric,
  p_students jsonb  -- [{ "student_id": uuid, "rate": numeric }]
) RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_session_id uuid;
  v_row jsonb;
BEGIN
  IF p_students IS NULL OR jsonb_array_length(p_students) = 0 THEN
    RAISE EXCEPTION 'At least one student is required';
  END IF;

  INSERT INTO public.sessions (
    organization_id, tutor_id, start_time, end_time, topic, status,
    notes, cancellation_reason, tutor_pay_rate
  )
  VALUES (
    p_organization_id, p_tutor_id, p_start_time, p_end_time, p_topic, p_status,
    p_notes, p_cancellation_reason, p_tutor_pay_rate
  )
  RETURNING id INTO v_session_id;

  FOR v_row IN SELECT * FROM jsonb_array_elements(p_students)
  LOOP
    INSERT INTO public.session_students (session_id, student_id, rate)
    VALUES (
      v_session_id,
      (v_row->>'student_id')::uuid,
      (v_row->>'rate')::numeric
    );
  END LOOP;

  RETURN v_session_id;
END $$;

CREATE OR REPLACE FUNCTION public.update_session_with_students(
  p_session_id uuid,
  p_tutor_id uuid,
  p_start_time timestamptz,
  p_end_time timestamptz,
  p_topic text,
  p_status text,
  p_notes text,
  p_cancellation_reason text,
  p_tutor_pay_rate numeric,
  p_students jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_row jsonb;
BEGIN
  IF p_students IS NULL OR jsonb_array_length(p_students) = 0 THEN
    RAISE EXCEPTION 'At least one student is required';
  END IF;

  UPDATE public.sessions
  SET tutor_id = p_tutor_id,
      start_time = p_start_time,
      end_time = p_end_time,
      topic = p_topic,
      status = p_status,
      notes = p_notes,
      cancellation_reason = p_cancellation_reason,
      tutor_pay_rate = p_tutor_pay_rate
  WHERE id = p_session_id;

  DELETE FROM public.session_students WHERE session_id = p_session_id;

  FOR v_row IN SELECT * FROM jsonb_array_elements(p_students)
  LOOP
    INSERT INTO public.session_students (session_id, student_id, rate)
    VALUES (
      p_session_id,
      (v_row->>'student_id')::uuid,
      (v_row->>'rate')::numeric
    );
  END LOOP;

  RETURN p_session_id;
END $$;

-- ============================================================
-- 15. Phase 3 – Availability, attendance, invoicing, recurring
--     sessions. All additive & idempotent.
-- ============================================================

-- Extensions required by downstream constraints / features
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ------------------------------------------------------------
-- 15.3 Tutor profile enrichment
-- ------------------------------------------------------------
ALTER TABLE public.tutors
  ADD COLUMN IF NOT EXISTS subjects_taught text[] NOT NULL DEFAULT '{}'::text[];
ALTER TABLE public.tutors
  ADD COLUMN IF NOT EXISTS year_levels_taught integer[] NOT NULL DEFAULT '{}'::integer[];

-- ------------------------------------------------------------
-- 15.4 session_series — recurring session groups
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.session_series (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  tutor_id uuid REFERENCES public.tutors(id),
  topic text NOT NULL,
  frequency text NOT NULL DEFAULT 'weekly'
    CHECK (frequency IN ('weekly','fortnightly','monthly')),
  day_of_week smallint CHECK (day_of_week BETWEEN 0 AND 6),
  start_time_of_day time,
  end_time_of_day time,
  start_date date NOT NULL,
  end_date date,
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.session_series ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='session_series' AND policyname='session_series_org') THEN
    CREATE POLICY "session_series_org" ON public.session_series FOR ALL
      USING (organization_id IN (SELECT id FROM public.organizations WHERE owner_id = auth.uid()));
  END IF;
END $$;

-- Link sessions back to their series
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS session_series_id uuid REFERENCES public.session_series(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS sessions_series_idx
  ON public.sessions (session_series_id)
  WHERE session_series_id IS NOT NULL;

-- ------------------------------------------------------------
-- 15.5 Double-booking prevention (tutor & student)
-- ------------------------------------------------------------
-- Tutor cannot be booked to two overlapping non-cancelled sessions.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sessions_tutor_no_overlap') THEN
    ALTER TABLE public.sessions
      ADD CONSTRAINT sessions_tutor_no_overlap
      EXCLUDE USING gist (
        tutor_id WITH =,
        tstzrange(start_time, end_time, '[)') WITH &&
      )
      WHERE (tutor_id IS NOT NULL AND status IN ('scheduled','completed'));
  END IF;
END $$;

-- Student cannot be double-booked either. Enforced via a constraint trigger
-- because session_students rows are inserted after the session row.
CREATE OR REPLACE FUNCTION public.enforce_student_no_overlap()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_start timestamptz;
  v_end timestamptz;
  v_status text;
BEGIN
  SELECT start_time, end_time, status
    INTO v_start, v_end, v_status
    FROM public.sessions WHERE id = NEW.session_id;
  IF v_status NOT IN ('scheduled','completed') THEN
    RETURN NEW;
  END IF;
  IF EXISTS (
    SELECT 1
    FROM public.session_students ss
    JOIN public.sessions s ON s.id = ss.session_id
    WHERE ss.student_id = NEW.student_id
      AND ss.session_id <> NEW.session_id
      AND s.status IN ('scheduled','completed')
      AND tstzrange(s.start_time, s.end_time, '[)') && tstzrange(v_start, v_end, '[)')
  ) THEN
    RAISE EXCEPTION 'Student % is already booked in an overlapping session', NEW.student_id;
  END IF;
  RETURN NEW;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'session_students_no_overlap') THEN
    CREATE CONSTRAINT TRIGGER session_students_no_overlap
      AFTER INSERT OR UPDATE ON public.session_students
      DEFERRABLE INITIALLY DEFERRED
      FOR EACH ROW EXECUTE FUNCTION public.enforce_student_no_overlap();
  END IF;
END $$;

-- ------------------------------------------------------------
-- 15.6 availabilities — for tutors and students
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.availabilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  owner_type text NOT NULL CHECK (owner_type IN ('tutor','student')),
  tutor_id uuid REFERENCES public.tutors(id) ON DELETE CASCADE,
  student_id uuid REFERENCES public.students(id) ON DELETE CASCADE,
  day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time_of_day time NOT NULL,
  end_time_of_day time NOT NULL,
  effective_from date,
  effective_until date,
  created_at timestamptz DEFAULT now(),
  CHECK (
    (owner_type = 'tutor'  AND tutor_id   IS NOT NULL AND student_id IS NULL) OR
    (owner_type = 'student' AND student_id IS NOT NULL AND tutor_id   IS NULL)
  ),
  CHECK (end_time_of_day > start_time_of_day)
);
CREATE INDEX IF NOT EXISTS availabilities_tutor_idx
  ON public.availabilities (tutor_id) WHERE tutor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS availabilities_student_idx
  ON public.availabilities (student_id) WHERE student_id IS NOT NULL;

ALTER TABLE public.availabilities ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='availabilities' AND policyname='availabilities_org') THEN
    CREATE POLICY "availabilities_org" ON public.availabilities FOR ALL
      USING (organization_id IN (SELECT id FROM public.organizations WHERE owner_id = auth.uid()));
  END IF;
END $$;

-- ------------------------------------------------------------
-- 15.7 attendance — per-student, per-session
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','present','absent','excused','late')),
  marked_at timestamptz,
  marked_by uuid REFERENCES auth.users(id),
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (session_id, student_id)
);
CREATE INDEX IF NOT EXISTS attendance_student_idx
  ON public.attendance (student_id);

ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='attendance' AND policyname='attendance_org') THEN
    CREATE POLICY "attendance_org" ON public.attendance FOR ALL
      USING (session_id IN (
        SELECT id FROM public.sessions
        WHERE organization_id IN (SELECT id FROM public.organizations WHERE owner_id = auth.uid())
      ));
  END IF;
END $$;

-- Auto-create attendance rows when a student is attached to a session
CREATE OR REPLACE FUNCTION public.seed_attendance_on_session_student()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_status text;
  v_attend text;
BEGIN
  SELECT status INTO v_status FROM public.sessions WHERE id = NEW.session_id;
  v_attend := CASE
    WHEN v_status = 'completed' THEN 'present'
    WHEN v_status IN ('cancelled_billable','cancelled_free') THEN 'excused'
    ELSE 'pending'
  END;
  INSERT INTO public.attendance (session_id, student_id, status)
  VALUES (NEW.session_id, NEW.student_id, v_attend)
  ON CONFLICT (session_id, student_id) DO NOTHING;
  RETURN NEW;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'session_students_seed_attendance') THEN
    CREATE TRIGGER session_students_seed_attendance
      AFTER INSERT ON public.session_students
      FOR EACH ROW EXECUTE FUNCTION public.seed_attendance_on_session_student();
  END IF;
END $$;

-- Backfill attendance for any legacy session_students without an attendance row
INSERT INTO public.attendance (session_id, student_id, status)
SELECT ss.session_id, ss.student_id,
  CASE
    WHEN s.status = 'completed' THEN 'present'
    WHEN s.status IN ('cancelled_billable','cancelled_free') THEN 'excused'
    ELSE 'pending'
  END
FROM public.session_students ss
JOIN public.sessions s ON s.id = ss.session_id
LEFT JOIN public.attendance a
  ON a.session_id = ss.session_id AND a.student_id = ss.student_id
WHERE a.id IS NULL;

-- ------------------------------------------------------------
-- 15.8 invoices & invoice_payments
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
  invoice_number text NOT NULL,
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  amount numeric NOT NULL CHECK (amount > 0),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','sent','partial','paid','void')),
  pdf_url text,
  sent_at timestamptz,
  paid_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (organization_id, invoice_number)
);
CREATE INDEX IF NOT EXISTS invoices_student_idx ON public.invoices (student_id);
CREATE INDEX IF NOT EXISTS invoices_status_idx ON public.invoices (organization_id, status);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='invoices' AND policyname='invoices_org') THEN
    CREATE POLICY "invoices_org" ON public.invoices FOR ALL
      USING (organization_id IN (SELECT id FROM public.organizations WHERE owner_id = auth.uid()));
  END IF;
END $$;

-- Reconciles a payment (or portion of it) against an invoice
CREATE TABLE IF NOT EXISTS public.invoice_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  payment_id uuid NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),
  created_at timestamptz DEFAULT now(),
  UNIQUE (invoice_id, payment_id)
);
ALTER TABLE public.invoice_payments ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='invoice_payments' AND policyname='invoice_payments_org') THEN
    CREATE POLICY "invoice_payments_org" ON public.invoice_payments FOR ALL
      USING (invoice_id IN (
        SELECT id FROM public.invoices
        WHERE organization_id IN (SELECT id FROM public.organizations WHERE owner_id = auth.uid())
      ));
  END IF;
END $$;

-- ------------------------------------------------------------
-- 15.9 Student balance view (prepaid/owed computation)
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW public.student_balances AS
SELECT
  s.id AS student_id,
  s.organization_id,
  s.full_name,
  COALESCE(pay.total, 0) AS total_paid,
  COALESCE(billed.total, 0) AS total_billed,
  COALESCE(pay.total, 0) - COALESCE(billed.total, 0) AS balance,
  -- number of prepaid sessions remaining at this student's default_rate
  CASE
    WHEN s.default_rate > 0
    THEN GREATEST(0, FLOOR((COALESCE(pay.total, 0) - COALESCE(billed.total, 0)) / s.default_rate))::int
    ELSE 0
  END AS prepaid_sessions_remaining
FROM public.students s
LEFT JOIN (
  SELECT student_id, SUM(amount) AS total
  FROM public.payments
  GROUP BY student_id
) pay ON pay.student_id = s.id
LEFT JOIN (
  SELECT ss.student_id,
         SUM(ss.rate * EXTRACT(EPOCH FROM (se.end_time - se.start_time)) / 3600.0) AS total
  FROM public.session_students ss
  JOIN public.sessions se ON se.id = ss.session_id
  WHERE se.status IN ('completed','cancelled_billable')
  GROUP BY ss.student_id
) billed ON billed.student_id = s.id;

-- Grant the view to authenticated users (RLS on base tables still applies)
GRANT SELECT ON public.student_balances TO authenticated;

-- ============================================================
-- 16. Phase 4 - Scheduling helpers
-- ============================================================

-- Create a session_series plus N session rows in one transactional call.
-- Students are attached to every generated session at the rates supplied.
-- p_start_time / p_end_time define the first occurrence; subsequent ones
-- are offset by p_frequency ('weekly' = 7d, 'fortnightly' = 14d, 'monthly' = 1 month).
CREATE OR REPLACE FUNCTION public.create_recurring_sessions(
  p_organization_id uuid,
  p_tutor_id uuid,
  p_start_time timestamptz,
  p_end_time timestamptz,
  p_topic text,
  p_status text,
  p_notes text,
  p_cancellation_reason text,
  p_tutor_pay_rate numeric,
  p_students jsonb,
  p_frequency text,
  p_occurrences int
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_series_id uuid;
  v_session_id uuid;
  v_row jsonb;
  v_start timestamptz;
  v_end timestamptz;
  i int;
  v_interval interval;
  v_dow smallint;
  v_student_id uuid;
  v_student_count int;
  v_requested_count int;
BEGIN
  -- Tenancy guard: SECURITY DEFINER bypasses RLS, so verify the caller owns
  -- the target org (and that the tutor + students all belong to it) before
  -- any write. Without this, an authenticated user could inject rows into
  -- another tenant's data by passing a foreign p_organization_id.
  IF NOT EXISTS (
    SELECT 1 FROM public.organizations
    WHERE id = p_organization_id AND owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'not authorized for organization %', p_organization_id
      USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.tutors
    WHERE id = p_tutor_id AND organization_id = p_organization_id
  ) THEN
    RAISE EXCEPTION 'tutor % does not belong to organization %',
      p_tutor_id, p_organization_id USING ERRCODE = '42501';
  END IF;

  IF p_students IS NULL OR jsonb_array_length(p_students) = 0 THEN
    RAISE EXCEPTION 'At least one student is required';
  END IF;

  -- Verify every student_id belongs to the caller's org
  v_requested_count := jsonb_array_length(p_students);
  SELECT count(DISTINCT s.id) INTO v_student_count
  FROM public.students s
  JOIN jsonb_array_elements(p_students) e
    ON s.id = (e->>'student_id')::uuid
  WHERE s.organization_id = p_organization_id;

  IF v_student_count <> (
    SELECT count(DISTINCT (e->>'student_id')::uuid)
    FROM jsonb_array_elements(p_students) e
  ) THEN
    RAISE EXCEPTION 'one or more students do not belong to organization %',
      p_organization_id USING ERRCODE = '42501';
  END IF;

  IF p_occurrences < 1 OR p_occurrences > 52 THEN
    RAISE EXCEPTION 'occurrences must be between 1 and 52';
  END IF;
  IF p_frequency NOT IN ('weekly','fortnightly','monthly') THEN
    RAISE EXCEPTION 'invalid frequency: %', p_frequency;
  END IF;

  v_interval := CASE p_frequency
    WHEN 'weekly' THEN interval '7 days'
    WHEN 'fortnightly' THEN interval '14 days'
    WHEN 'monthly' THEN interval '1 month'
  END;

  v_dow := EXTRACT(DOW FROM p_start_time)::smallint;

  INSERT INTO public.session_series (
    organization_id, tutor_id, topic, frequency,
    day_of_week, start_time_of_day, end_time_of_day,
    start_date, end_date
  ) VALUES (
    p_organization_id, p_tutor_id, p_topic, p_frequency,
    v_dow, p_start_time::time, p_end_time::time,
    p_start_time::date, (p_start_time + (p_occurrences - 1) * v_interval)::date
  )
  RETURNING id INTO v_series_id;

  FOR i IN 0 .. (p_occurrences - 1) LOOP
    v_start := p_start_time + i * v_interval;
    v_end   := p_end_time   + i * v_interval;

    INSERT INTO public.sessions (
      organization_id, tutor_id, start_time, end_time,
      topic, status, notes, cancellation_reason,
      tutor_pay_rate, session_series_id
    ) VALUES (
      p_organization_id, p_tutor_id, v_start, v_end,
      p_topic, p_status::session_status, p_notes, p_cancellation_reason,
      p_tutor_pay_rate, v_series_id
    )
    RETURNING id INTO v_session_id;

    FOR v_row IN SELECT * FROM jsonb_array_elements(p_students) LOOP
      INSERT INTO public.session_students (session_id, student_id, rate)
      VALUES (
        v_session_id,
        (v_row->>'student_id')::uuid,
        (v_row->>'rate')::numeric
      );
    END LOOP;
  END LOOP;

  RETURN v_series_id;
END $$;

-- ============================================================
-- 17. Phase 6 – Invoicing storage bucket + policies
-- ============================================================

-- Private bucket for generated invoice PDFs.
-- Paths: {organization_id}/{invoice_id}.pdf
INSERT INTO storage.buckets (id, name, public)
VALUES ('invoices', 'invoices', false)
ON CONFLICT (id) DO NOTHING;

-- Only org owners can read/write objects under their own org folder.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects'
      AND policyname='invoices_bucket_owner_all'
  ) THEN
    CREATE POLICY "invoices_bucket_owner_all" ON storage.objects
      FOR ALL
      USING (
        bucket_id = 'invoices' AND auth.uid() IS NOT NULL AND
        (storage.foldername(name))[1] IN (
          SELECT id::text FROM public.organizations WHERE owner_id = auth.uid()
        )
      )
      WITH CHECK (
        bucket_id = 'invoices' AND auth.uid() IS NOT NULL AND
        (storage.foldername(name))[1] IN (
          SELECT id::text FROM public.organizations WHERE owner_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Monotonic per-org invoice sequence so invoice numbers stay collision-free
-- even under concurrent generation.
CREATE TABLE IF NOT EXISTS public.invoice_sequences (
  organization_id uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  last_value integer NOT NULL DEFAULT 0
);
ALTER TABLE public.invoice_sequences ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename='invoice_sequences' AND policyname='invoice_sequences_org'
  ) THEN
    CREATE POLICY "invoice_sequences_org" ON public.invoice_sequences FOR ALL
      USING (organization_id IN (SELECT id FROM public.organizations WHERE owner_id = auth.uid()));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.next_invoice_number(p_org uuid)
RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  v_next integer;
BEGIN
  INSERT INTO public.invoice_sequences (organization_id, last_value)
  VALUES (p_org, 1)
  ON CONFLICT (organization_id)
  DO UPDATE SET last_value = invoice_sequences.last_value + 1
  RETURNING last_value INTO v_next;

  RETURN 'INV-' || to_char(CURRENT_DATE, 'YYYYMM') || '-' || lpad(v_next::text, 4, '0');
END $$;

-- ============================================================
-- 18. email_drafts — LLM-generated email workflow (Phase 8)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.email_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  context_type text NOT NULL
    CHECK (context_type IN (
      'session_summary','invoice_reminder','marketing','resource_assignment',
      'attendance_absence','prepaid_topup','custom'
    )),
  context_id uuid,
  student_id uuid REFERENCES public.students(id) ON DELETE SET NULL,
  to_email text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','sent','failed','discarded')),
  sent_at timestamptz,
  error text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS email_drafts_org_idx
  ON public.email_drafts (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS email_drafts_context_idx
  ON public.email_drafts (context_type, context_id);

ALTER TABLE public.email_drafts ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='email_drafts' AND policyname='email_drafts_org') THEN
    CREATE POLICY "email_drafts_org" ON public.email_drafts FOR ALL
      USING (organization_id IN (SELECT id FROM public.organizations WHERE owner_id = auth.uid()));
  END IF;
END $$;

-- ============================================================
-- 19. notifications — in-app bell (Phase 9)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL
    CHECK (type IN ('prepaid_low','attendance_absent','invoice_overdue','generic')),
  title text NOT NULL,
  body text,
  link text,
  context_id uuid,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notifications_recipient_unread_idx
  ON public.notifications (recipient_id, created_at DESC)
  WHERE read_at IS NULL;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='notifications' AND policyname='notifications_self') THEN
    CREATE POLICY "notifications_self" ON public.notifications FOR ALL
      USING (recipient_id = auth.uid());
  END IF;
END $$;

-- ============================================================
-- 20. Drop legacy / unused objects (owner-only app, no role system)
-- ============================================================
DROP TABLE IF EXISTS public.user_profiles CASCADE;
DROP FUNCTION IF EXISTS public.current_user_role();
DROP FUNCTION IF EXISTS public.is_org_owner(uuid);
DROP FUNCTION IF EXISTS public.is_org_tutor(uuid);
DROP FUNCTION IF EXISTS public.current_tutor_id();

-- ============================================================
-- 21. Notification generators (Phase 9)
--     Triggers fire SECURITY DEFINER so they can insert into
--     notifications regardless of the row's RLS context. They
--     always derive recipient_id from the owning organization.
-- ============================================================

-- Helper: resolve the recipient (owner) for an organization.
CREATE OR REPLACE FUNCTION public.org_owner(p_org uuid)
RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT owner_id FROM public.organizations WHERE id = p_org;
$$;

-- 21.1 Attendance absent -> notification
CREATE OR REPLACE FUNCTION public.notify_attendance_absent()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_org uuid;
  v_owner uuid;
  v_student text;
  v_session_start timestamptz;
BEGIN
  IF NEW.status <> 'absent' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'absent' THEN
    RETURN NEW;
  END IF;

  SELECT s.organization_id, s.start_time, st.full_name
    INTO v_org, v_session_start, v_student
    FROM public.sessions s
    JOIN public.students st ON st.id = NEW.student_id
   WHERE s.id = NEW.session_id;

  v_owner := public.org_owner(v_org);
  IF v_owner IS NULL THEN RETURN NEW; END IF;

  INSERT INTO public.notifications (
    organization_id, recipient_id, type, title, body, link, context_id
  ) VALUES (
    v_org, v_owner, 'attendance_absent',
    v_student || ' marked absent',
    'Session on ' || to_char(v_session_start, 'DD Mon YYYY HH24:MI'),
    '/dashboard/sessions/' || NEW.session_id,
    NEW.id
  );
  RETURN NEW;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'attendance_notify_absent') THEN
    CREATE TRIGGER attendance_notify_absent
      AFTER INSERT OR UPDATE OF status ON public.attendance
      FOR EACH ROW EXECUTE FUNCTION public.notify_attendance_absent();
  END IF;
END $$;

-- 21.2 Prepaid balance low -> notification (fires when billed/paid changes).
-- De-duplicates: only fires if the most recent prepaid_low notification for
-- this student was > 24h ago OR balance crossed from > threshold to <= threshold.
CREATE OR REPLACE FUNCTION public.notify_prepaid_low_for_student(p_student uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_row record;
  v_owner uuid;
  v_last_at timestamptz;
BEGIN
  SELECT sb.student_id, sb.organization_id, sb.full_name, sb.prepaid_sessions_remaining
    INTO v_row
    FROM public.student_balances sb
   WHERE sb.student_id = p_student;
  IF NOT FOUND THEN RETURN; END IF;
  IF v_row.prepaid_sessions_remaining > 2 THEN RETURN; END IF;

  v_owner := public.org_owner(v_row.organization_id);
  IF v_owner IS NULL THEN RETURN; END IF;

  SELECT MAX(created_at) INTO v_last_at
    FROM public.notifications
   WHERE type = 'prepaid_low'
     AND context_id = p_student
     AND recipient_id = v_owner;

  IF v_last_at IS NOT NULL AND v_last_at > now() - interval '24 hours' THEN
    RETURN;
  END IF;

  INSERT INTO public.notifications (
    organization_id, recipient_id, type, title, body, link, context_id
  ) VALUES (
    v_row.organization_id, v_owner, 'prepaid_low',
    v_row.full_name || ' is running low on prepaid sessions',
    v_row.prepaid_sessions_remaining || ' session(s) remaining',
    '/dashboard/students/' || p_student,
    p_student
  );
END $$;

CREATE OR REPLACE FUNCTION public.tg_prepaid_low_on_session_students()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.notify_prepaid_low_for_student(OLD.student_id);
    RETURN OLD;
  END IF;
  PERFORM public.notify_prepaid_low_for_student(NEW.student_id);
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.tg_prepaid_low_on_sessions()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT DISTINCT student_id FROM public.session_students WHERE session_id = NEW.id LOOP
    PERFORM public.notify_prepaid_low_for_student(r.student_id);
  END LOOP;
  RETURN NEW;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'session_students_prepaid_low') THEN
    CREATE TRIGGER session_students_prepaid_low
      AFTER INSERT OR UPDATE OR DELETE ON public.session_students
      FOR EACH ROW EXECUTE FUNCTION public.tg_prepaid_low_on_session_students();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'sessions_prepaid_low_on_status') THEN
    CREATE TRIGGER sessions_prepaid_low_on_status
      AFTER UPDATE OF status ON public.sessions
      FOR EACH ROW EXECUTE FUNCTION public.tg_prepaid_low_on_sessions();
  END IF;
END $$;

-- 21.3 Invoice overdue sweep — called from the app, idempotent.
-- For every invoice where due_date < today and status in ('sent','partial'),
-- ensure one unread overdue notification exists.
CREATE OR REPLACE FUNCTION public.sweep_overdue_invoices()
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  r record;
  v_owner uuid;
BEGIN
  FOR r IN
    SELECT i.id, i.organization_id, i.invoice_number, i.due_date, i.student_id,
           s.full_name
    FROM public.invoices i
    JOIN public.students s ON s.id = i.student_id
    WHERE i.status IN ('sent','partial')
      AND i.due_date IS NOT NULL
      AND i.due_date < CURRENT_DATE
      AND i.organization_id IN (
        SELECT id FROM public.organizations WHERE owner_id = auth.uid()
      )
  LOOP
    v_owner := auth.uid();
    IF EXISTS (
      SELECT 1 FROM public.notifications
       WHERE type = 'invoice_overdue'
         AND context_id = r.id
         AND recipient_id = v_owner
         AND read_at IS NULL
    ) THEN
      CONTINUE;
    END IF;

    INSERT INTO public.notifications (
      organization_id, recipient_id, type, title, body, link, context_id
    ) VALUES (
      r.organization_id, v_owner, 'invoice_overdue',
      'Invoice ' || r.invoice_number || ' is overdue',
      r.full_name || ' · due ' || to_char(r.due_date, 'DD Mon YYYY'),
      '/dashboard/students/' || r.student_id,
      r.id
    );
  END LOOP;
END $$;
GRANT EXECUTE ON FUNCTION public.sweep_overdue_invoices() TO authenticated;



-- ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
-- ============================================================
-- 21. expressions_of_interest — public landing page lead capture
-- ============================================================
-- Anonymous visitors submit the EOI form on the marketing landing page.
-- Platform owner reviews submissions in the Supabase dashboard SQL editor
-- and manually creates an invitation for approved leads.
CREATE TABLE IF NOT EXISTS public.expressions_of_interest (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name text NOT NULL,
  owner_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  message text,
  status text NOT NULL DEFAULT 'new'
    CHECK (status IN ('new','contacted','invited','rejected')),
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS expressions_of_interest_created_idx
  ON public.expressions_of_interest (created_at DESC);

ALTER TABLE public.expressions_of_interest ENABLE ROW LEVEL SECURITY;

-- Anyone (including anonymous visitors) can submit a new EOI.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename='expressions_of_interest' AND policyname='eoi_public_insert'
  ) THEN
    CREATE POLICY "eoi_public_insert" ON public.expressions_of_interest
      FOR INSERT TO anon, authenticated
      WITH CHECK (true);
  END IF;
END $$;

-- No SELECT policy is defined: submissions are private and only readable
-- via the service role / Supabase SQL editor by the platform operator.
