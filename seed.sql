-- ============================================================
-- Tutor Portal – Seed / demo data
-- Idempotent: safe to re-run (guards against re-insertion)
-- Run in Supabase SQL Editor while logged in as an org owner.
-- Inserts into the caller's own organization (derived via auth.uid()).
-- ============================================================

DO $$
DECLARE
  v_org uuid;
  v_owner uuid;

  -- Tutors
  v_tutor_ava uuid;
  v_tutor_ben uuid;
  v_tutor_chen uuid;

  -- Students
  v_stu_amelia uuid;
  v_stu_oliver uuid;
  v_stu_mia uuid;
  v_stu_noah uuid;
  v_stu_zoe uuid;
  v_stu_liam uuid;
  v_stu_ava uuid;
  v_stu_ethan uuid;
  v_stu_ruby uuid;
  v_stu_henry uuid;

  -- Resources
  v_res_alg uuid;
  v_res_trig uuid;
  v_res_essay uuid;
  v_res_bio uuid;
  v_res_chem uuid;
  v_res_phys uuid;

  -- Sessions
  v_sess uuid;

  -- Date anchor: next Monday
  v_mon date := (CURRENT_DATE + ((8 - EXTRACT(ISODOW FROM CURRENT_DATE)::int) % 7))::date;

  -- Owner UUID. auth.uid() returns NULL when the SQL Editor runs as the
  -- `postgres` role, so we hard-code the target owner's id here. Replace this
  -- value when seeding for a different account.
  v_target_owner uuid := '12696472-d30d-43cd-96df-ebcd949305bc'::uuid;
BEGIN
  SELECT id, owner_id INTO v_org, v_owner
  FROM public.organizations
  WHERE owner_id = v_target_owner
  LIMIT 1;

  IF v_org IS NULL THEN
    RAISE EXCEPTION 'No organization found for current user. Sign in as an org owner before running this seed.';
  END IF;

  -- Short-circuit if the seed has already been run (detect by the seed marker email)
  IF EXISTS (
    SELECT 1 FROM public.students
    WHERE organization_id = v_org AND email = 'amelia.seed@example.com'
  ) THEN
    RAISE NOTICE 'Seed data already present for organization %, skipping.', v_org;
    RETURN;
  END IF;

  -- ------------------------------------------------------------
  -- Tutors (3)
  -- ------------------------------------------------------------
  INSERT INTO public.tutors (
    organization_id, full_name, email, phone, address, pay_rate,
    emergency_name, emergency_phone, subjects_taught, year_levels_taught
  ) VALUES
    (v_org, 'Ava Thompson', 'ava.seed@example.com', '0400 100 001',
     '12 Smith St, Sydney NSW', 60,
     'Kate Thompson', '0400 900 001',
     ARRAY['Mathematics','Physics'], ARRAY[9,10,11,12])
  RETURNING id INTO v_tutor_ava;

  INSERT INTO public.tutors (
    organization_id, full_name, email, phone, address, pay_rate,
    emergency_name, emergency_phone, subjects_taught, year_levels_taught
  ) VALUES
    (v_org, 'Ben Carter', 'ben.seed@example.com', '0400 100 002',
     '45 Park Rd, Sydney NSW', 55,
     'Jane Carter', '0400 900 002',
     ARRAY['English','History'], ARRAY[7,8,9,10,11,12])
  RETURNING id INTO v_tutor_ben;

  INSERT INTO public.tutors (
    organization_id, full_name, email, phone, address, pay_rate,
    emergency_name, emergency_phone, subjects_taught, year_levels_taught
  ) VALUES
    (v_org, 'Chen Li', 'chen.seed@example.com', '0400 100 003',
     '88 King St, Sydney NSW', 65,
     'Mei Li', '0400 900 003',
     ARRAY['Chemistry','Biology'], ARRAY[10,11,12])
  RETURNING id INTO v_tutor_chen;

  -- ------------------------------------------------------------
  -- Students (10)
  -- ------------------------------------------------------------
  INSERT INTO public.students (
    organization_id, full_name, email, phone, grade_level, default_rate,
    parent_name, parent_email, parent_phone
  ) VALUES
    (v_org, 'Amelia Nguyen', 'amelia.seed@example.com', '0401 000 001', 11, 80,
     'Linh Nguyen', 'linh.nguyen.seed@example.com', '0402 000 001')
  RETURNING id INTO v_stu_amelia;

  INSERT INTO public.students (organization_id, full_name, email, phone, grade_level, default_rate, parent_name, parent_email, parent_phone)
  VALUES (v_org, 'Oliver Brown', 'oliver.seed@example.com', '0401 000 002', 10, 75,
          'Sarah Brown', 'sarah.brown.seed@example.com', '0402 000 002')
  RETURNING id INTO v_stu_oliver;

  INSERT INTO public.students (organization_id, full_name, email, phone, grade_level, default_rate, parent_name, parent_email, parent_phone)
  VALUES (v_org, 'Mia Patel', 'mia.seed@example.com', '0401 000 003', 12, 90,
          'Raj Patel', 'raj.patel.seed@example.com', '0402 000 003')
  RETURNING id INTO v_stu_mia;

  INSERT INTO public.students (organization_id, full_name, email, phone, grade_level, default_rate, parent_name, parent_email, parent_phone)
  VALUES (v_org, 'Noah Wilson', 'noah.seed@example.com', '0401 000 004', 9, 70,
          'Emma Wilson', 'emma.wilson.seed@example.com', '0402 000 004')
  RETURNING id INTO v_stu_noah;

  INSERT INTO public.students (organization_id, full_name, email, phone, grade_level, default_rate, parent_name, parent_email, parent_phone)
  VALUES (v_org, 'Zoe Martin', 'zoe.seed@example.com', '0401 000 005', 11, 80,
          'David Martin', 'david.martin.seed@example.com', '0402 000 005')
  RETURNING id INTO v_stu_zoe;

  INSERT INTO public.students (organization_id, full_name, email, phone, grade_level, default_rate, parent_name, parent_email, parent_phone)
  VALUES (v_org, 'Liam O''Connor', 'liam.seed@example.com', '0401 000 006', 10, 75,
          'Claire O''Connor', 'claire.oconnor.seed@example.com', '0402 000 006')
  RETURNING id INTO v_stu_liam;

  INSERT INTO public.students (organization_id, full_name, email, phone, grade_level, default_rate, parent_name, parent_email, parent_phone)
  VALUES (v_org, 'Ava Johnson', 'ava.johnson.seed@example.com', '0401 000 007', 12, 90,
          'Mark Johnson', 'mark.johnson.seed@example.com', '0402 000 007')
  RETURNING id INTO v_stu_ava;

  INSERT INTO public.students (organization_id, full_name, email, phone, grade_level, default_rate, parent_name, parent_email, parent_phone)
  VALUES (v_org, 'Ethan Singh', 'ethan.seed@example.com', '0401 000 008', 8, 65,
          'Priya Singh', 'priya.singh.seed@example.com', '0402 000 008')
  RETURNING id INTO v_stu_ethan;

  INSERT INTO public.students (organization_id, full_name, email, phone, grade_level, default_rate, parent_name, parent_email, parent_phone)
  VALUES (v_org, 'Ruby Taylor', 'ruby.seed@example.com', '0401 000 009', 11, 80,
          'Hannah Taylor', 'hannah.taylor.seed@example.com', '0402 000 009')
  RETURNING id INTO v_stu_ruby;

  INSERT INTO public.students (organization_id, full_name, email, phone, grade_level, default_rate, parent_name, parent_email, parent_phone)
  VALUES (v_org, 'Henry Clarke', 'henry.seed@example.com', '0401 000 010', 9, 70,
          'Oliver Clarke', 'oliver.clarke.seed@example.com', '0402 000 010')
  RETURNING id INTO v_stu_henry;

  -- ------------------------------------------------------------
  -- Resources (6)
  -- ------------------------------------------------------------
  INSERT INTO public.resources (organization_id, title, subject, grade_level, url, notes)
  VALUES (v_org, 'Algebra Fundamentals Worksheet', 'Mathematics', 10,
          'https://example.com/resources/algebra-fundamentals.pdf',
          'Covers linear equations and factoring.')
  RETURNING id INTO v_res_alg;

  INSERT INTO public.resources (organization_id, title, subject, grade_level, url, notes)
  VALUES (v_org, 'Trigonometry Practice Set', 'Mathematics', 11,
          'https://example.com/resources/trig-practice.pdf',
          'Unit circle and identities.')
  RETURNING id INTO v_res_trig;

  INSERT INTO public.resources (organization_id, title, subject, grade_level, url, notes)
  VALUES (v_org, 'Essay Structure Guide', 'English', 11,
          'https://example.com/resources/essay-guide.pdf',
          'TEEL paragraph structure.')
  RETURNING id INTO v_res_essay;

  INSERT INTO public.resources (organization_id, title, subject, grade_level, url, notes)
  VALUES (v_org, 'Cell Biology Revision', 'Biology', 12,
          'https://example.com/resources/cell-biology.pdf', NULL)
  RETURNING id INTO v_res_bio;

  INSERT INTO public.resources (organization_id, title, subject, grade_level, url, notes)
  VALUES (v_org, 'Stoichiometry Worked Examples', 'Chemistry', 11,
          'https://example.com/resources/stoichiometry.pdf', NULL)
  RETURNING id INTO v_res_chem;

  INSERT INTO public.resources (organization_id, title, subject, grade_level, url, notes)
  VALUES (v_org, 'Kinematics Cheatsheet', 'Physics', 12,
          'https://example.com/resources/kinematics.pdf', NULL)
  RETURNING id INTO v_res_phys;

  -- ------------------------------------------------------------
  -- Sessions (12) — spread Mon–Fri next week, non-overlapping per tutor.
  -- Use the v_mon anchor + timezone-aware timestamps.
  -- ------------------------------------------------------------

  -- 1. Mon 15:00–16:00, Ava + Amelia (Math)
  INSERT INTO public.sessions (organization_id, tutor_id, start_time, end_time, topic, tutor_pay_rate)
  VALUES (v_org, v_tutor_ava, (v_mon + time '15:00') AT TIME ZONE 'Australia/Sydney',
          (v_mon + time '16:00') AT TIME ZONE 'Australia/Sydney',
          'Quadratic equations review', 60)
  RETURNING id INTO v_sess;
  INSERT INTO public.session_students (session_id, student_id, rate)
    VALUES (v_sess, v_stu_amelia, 80);
  INSERT INTO public.session_resources (session_id, resource_id, student_id, notes)
    VALUES (v_sess, v_res_alg, v_stu_amelia, 'Attempt Q1–Q10 before next session');

  -- 2. Mon 16:30–17:30, Ava + Oliver (Math)
  INSERT INTO public.sessions (organization_id, tutor_id, start_time, end_time, topic, tutor_pay_rate)
  VALUES (v_org, v_tutor_ava, (v_mon + time '16:30') AT TIME ZONE 'Australia/Sydney',
          (v_mon + time '17:30') AT TIME ZONE 'Australia/Sydney',
          'Linear functions intro', 60)
  RETURNING id INTO v_sess;
  INSERT INTO public.session_students (session_id, student_id, rate)
    VALUES (v_sess, v_stu_oliver, 75);

  -- 3. Mon 17:00–18:00, Ben + Noah (English) — different tutor so no conflict
  INSERT INTO public.sessions (organization_id, tutor_id, start_time, end_time, topic, tutor_pay_rate)
  VALUES (v_org, v_tutor_ben, (v_mon + time '17:00') AT TIME ZONE 'Australia/Sydney',
          (v_mon + time '18:00') AT TIME ZONE 'Australia/Sydney',
          'Essay structure basics', 55)
  RETURNING id INTO v_sess;
  INSERT INTO public.session_students (session_id, student_id, rate)
    VALUES (v_sess, v_stu_noah, 70);
  INSERT INTO public.session_resources (session_id, resource_id, student_id, notes)
    VALUES (v_sess, v_res_essay, v_stu_noah, NULL);

  -- 4. Tue 15:00–16:30, Chen + Mia (Chemistry, longer)
  INSERT INTO public.sessions (organization_id, tutor_id, start_time, end_time, topic, tutor_pay_rate)
  VALUES (v_org, v_tutor_chen, ((v_mon + 1) + time '15:00') AT TIME ZONE 'Australia/Sydney',
          ((v_mon + 1) + time '16:30') AT TIME ZONE 'Australia/Sydney',
          'Stoichiometry workshop', 65)
  RETURNING id INTO v_sess;
  INSERT INTO public.session_students (session_id, student_id, rate)
    VALUES (v_sess, v_stu_mia, 90);
  INSERT INTO public.session_resources (session_id, resource_id, student_id, notes)
    VALUES (v_sess, v_res_chem, v_stu_mia, 'Work through examples 3 and 5');

  -- 5. Tue 17:00–18:00, Ava + Zoe
  INSERT INTO public.sessions (organization_id, tutor_id, start_time, end_time, topic, tutor_pay_rate)
  VALUES (v_org, v_tutor_ava, ((v_mon + 1) + time '17:00') AT TIME ZONE 'Australia/Sydney',
          ((v_mon + 1) + time '18:00') AT TIME ZONE 'Australia/Sydney',
          'Trigonometric identities', 60)
  RETURNING id INTO v_sess;
  INSERT INTO public.session_students (session_id, student_id, rate)
    VALUES (v_sess, v_stu_zoe, 80);
  INSERT INTO public.session_resources (session_id, resource_id, student_id, notes)
    VALUES (v_sess, v_res_trig, v_stu_zoe, NULL);

  -- 6. Wed 15:30–16:30, Ben + Liam + Ava Johnson (group)
  INSERT INTO public.sessions (organization_id, tutor_id, start_time, end_time, topic, tutor_pay_rate)
  VALUES (v_org, v_tutor_ben, ((v_mon + 2) + time '15:30') AT TIME ZONE 'Australia/Sydney',
          ((v_mon + 2) + time '16:30') AT TIME ZONE 'Australia/Sydney',
          'Comparative essay workshop', 55)
  RETURNING id INTO v_sess;
  INSERT INTO public.session_students (session_id, student_id, rate)
    VALUES (v_sess, v_stu_liam, 70),
           (v_sess, v_stu_ava, 80);

  -- 7. Wed 17:00–18:00, Chen + Ethan (Biology intro — year 8, adjusted)
  INSERT INTO public.sessions (organization_id, tutor_id, start_time, end_time, topic, tutor_pay_rate)
  VALUES (v_org, v_tutor_chen, ((v_mon + 2) + time '17:00') AT TIME ZONE 'Australia/Sydney',
          ((v_mon + 2) + time '18:00') AT TIME ZONE 'Australia/Sydney',
          'Intro to cells', 65)
  RETURNING id INTO v_sess;
  INSERT INTO public.session_students (session_id, student_id, rate)
    VALUES (v_sess, v_stu_ethan, 65);

  -- 8. Thu 15:00–16:00, Ava + Ruby (Physics)
  INSERT INTO public.sessions (organization_id, tutor_id, start_time, end_time, topic, tutor_pay_rate)
  VALUES (v_org, v_tutor_ava, ((v_mon + 3) + time '15:00') AT TIME ZONE 'Australia/Sydney',
          ((v_mon + 3) + time '16:00') AT TIME ZONE 'Australia/Sydney',
          'Kinematics problems', 60)
  RETURNING id INTO v_sess;
  INSERT INTO public.session_students (session_id, student_id, rate)
    VALUES (v_sess, v_stu_ruby, 80);
  INSERT INTO public.session_resources (session_id, resource_id, student_id, notes)
    VALUES (v_sess, v_res_phys, v_stu_ruby, NULL);

  -- 9. Thu 16:30–17:30, Ben + Henry
  INSERT INTO public.sessions (organization_id, tutor_id, start_time, end_time, topic, tutor_pay_rate)
  VALUES (v_org, v_tutor_ben, ((v_mon + 3) + time '16:30') AT TIME ZONE 'Australia/Sydney',
          ((v_mon + 3) + time '17:30') AT TIME ZONE 'Australia/Sydney',
          'Narrative writing techniques', 55)
  RETURNING id INTO v_sess;
  INSERT INTO public.session_students (session_id, student_id, rate)
    VALUES (v_sess, v_stu_henry, 70);

  -- 10. Fri 15:00–16:00, Chen + Mia (follow-up)
  INSERT INTO public.sessions (organization_id, tutor_id, start_time, end_time, topic, tutor_pay_rate)
  VALUES (v_org, v_tutor_chen, ((v_mon + 4) + time '15:00') AT TIME ZONE 'Australia/Sydney',
          ((v_mon + 4) + time '16:00') AT TIME ZONE 'Australia/Sydney',
          'Cell biology revision', 65)
  RETURNING id INTO v_sess;
  INSERT INTO public.session_students (session_id, student_id, rate)
    VALUES (v_sess, v_stu_mia, 90);
  INSERT INTO public.session_resources (session_id, resource_id, student_id, notes)
    VALUES (v_sess, v_res_bio, v_stu_mia, NULL);

  -- 11. Fri 16:30–17:30, Ava + Amelia + Zoe (group math)
  INSERT INTO public.sessions (organization_id, tutor_id, start_time, end_time, topic, tutor_pay_rate)
  VALUES (v_org, v_tutor_ava, ((v_mon + 4) + time '16:30') AT TIME ZONE 'Australia/Sydney',
          ((v_mon + 4) + time '17:30') AT TIME ZONE 'Australia/Sydney',
          'Mock exam review', 60)
  RETURNING id INTO v_sess;
  INSERT INTO public.session_students (session_id, student_id, rate)
    VALUES (v_sess, v_stu_amelia, 80),
           (v_sess, v_stu_zoe, 80);

  -- 12. Completed session in the past week (so student_balances has billable hours)
  INSERT INTO public.sessions (organization_id, tutor_id, start_time, end_time, topic, status, tutor_pay_rate)
  VALUES (v_org, v_tutor_ava, ((v_mon - 5) + time '15:00') AT TIME ZONE 'Australia/Sydney',
          ((v_mon - 5) + time '16:00') AT TIME ZONE 'Australia/Sydney',
          'Algebra recap', 'completed', 60)
  RETURNING id INTO v_sess;
  INSERT INTO public.session_students (session_id, student_id, rate)
    VALUES (v_sess, v_stu_oliver, 75);

  -- Prepaid payment so Oliver has a visible balance movement
  INSERT INTO public.payments (organization_id, student_id, amount, method, description, payment_date)
  VALUES (v_org, v_stu_oliver, 300, 'bank_transfer', 'Seed: prepaid 4 sessions', CURRENT_DATE - 7);

  -- An expense for realism
  INSERT INTO public.expenses (organization_id, amount, category, description, expense_date)
  VALUES (v_org, 129, 'software', 'Seed: SaaS subscription', CURRENT_DATE - 14);

  RAISE NOTICE 'Seed data inserted for organization %', v_org;
END $$;
