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
  is_owner boolean DEFAULT false,
  auth_user_id uuid REFERENCES auth.users(id),
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
