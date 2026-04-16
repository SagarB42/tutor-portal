-- ============================================================
-- Migration: Add archive support, address, make email/phone nullable
-- Run this in the Supabase SQL Editor
-- ============================================================

-- Students: make email and phone nullable
ALTER TABLE public.students ALTER COLUMN email DROP NOT NULL;
ALTER TABLE public.students ALTER COLUMN phone DROP NOT NULL;

-- Students: add address column
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS address text;

-- Students: add archived_at for soft-delete
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS archived_at timestamptz;

-- Tutors: add archived_at for soft-delete
ALTER TABLE public.tutors ADD COLUMN IF NOT EXISTS archived_at timestamptz;
