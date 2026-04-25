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

-- ============================================================
-- Seed extension v2 — bigger demo dataset.
-- Idempotent (guards on a `dani.seed@example.com` tutor marker).
-- Adds: 3 more tutors, 20 more students, 6 more resources,
-- tutor & student availabilities, ~70 sessions across the last
-- 5 weeks and the next 2 weeks (completed / cancelled / scheduled),
-- attendance variations, payments, invoices (every status),
-- invoice reconciliations, and extra expenses.
-- Skipped on purpose: anything email-related (no email_drafts).
-- ============================================================
DO $$
DECLARE
  v_org              uuid;
  v_target_owner     uuid := '12696472-d30d-43cd-96df-ebcd949305bc'::uuid;
  v_mon              date := (CURRENT_DATE + ((8 - EXTRACT(ISODOW FROM CURRENT_DATE)::int) % 7))::date;

  -- Tutors (existing 3 may be NULL if first seed not run; new 3 always inserted)
  v_tutor_ava        uuid;
  v_tutor_ben        uuid;
  v_tutor_chen       uuid;
  v_tutor_dani       uuid;
  v_tutor_eli        uuid;
  v_tutor_farah      uuid;
  v_tutors           uuid[];

  -- Schedule grid kept in lockstep. day_offset is days from v_mon (0=Mon..4=Fri).
  v_t_idx            int[] := ARRAY[1, 2, 3, 4, 5, 6, 1, 2, 4, 3, 5, 6, 1, 4];
  v_day              int[] := ARRAY[0, 0, 0, 0, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4];
  v_start            time[] := ARRAY[
    time '15:00', time '16:00', time '17:00', time '18:00',
    time '15:00', time '16:30',
    time '16:00', time '17:30', time '15:00',
    time '16:00', time '17:30', time '15:00',
    time '17:00', time '16:00'
  ];
  v_topic            text[] := ARRAY[
    'Algebra revision', 'Essay practice', 'Stoichiometry deep-dive', 'Python basics',
    'Programming fundamentals', 'Problem set walkthrough',
    'Trig identities', 'Comparative essay', 'Computational thinking',
    'Cell biology', 'French oral practice', 'Statistics workshop',
    'Mock exam debrief', 'Algorithms tutorial'
  ];

  v_student_ids      uuid[];
  v_resource_ids     uuid[];

  v_sid              uuid;
  v_pid              uuid;
  v_iid              uuid;
  v_inv_no           text;
  v_student          uuid;
  v_tutor            uuid;
  v_pay_rate         numeric;
  v_status           text;
  v_amount           numeric;

  v_n_slots          int;
  v_w                int;          -- week offset (negative=past, positive=future)
  i                  int;
  j                  int;
BEGIN
  SELECT id INTO v_org FROM public.organizations
   WHERE owner_id = v_target_owner LIMIT 1;
  IF v_org IS NULL THEN
    RAISE EXCEPTION 'No organization for owner % — sign in / set v_target_owner.', v_target_owner;
  END IF;

  -- Idempotency guard
  IF EXISTS (
    SELECT 1 FROM public.tutors
     WHERE organization_id = v_org AND email = 'dani.seed@example.com'
  ) THEN
    RAISE NOTICE 'Extension seed already present for org %, skipping.', v_org;
    RETURN;
  END IF;

  -- Pick up the original seed's tutors (may be NULL if v1 was never run).
  SELECT id INTO v_tutor_ava   FROM public.tutors WHERE organization_id = v_org AND email = 'ava.seed@example.com';
  SELECT id INTO v_tutor_ben   FROM public.tutors WHERE organization_id = v_org AND email = 'ben.seed@example.com';
  SELECT id INTO v_tutor_chen  FROM public.tutors WHERE organization_id = v_org AND email = 'chen.seed@example.com';

  -- ----------------------------------------------------------
  -- 3 new tutors
  -- ----------------------------------------------------------
  INSERT INTO public.tutors (organization_id, full_name, email, phone, address, pay_rate,
                             emergency_name, emergency_phone, subjects_taught, year_levels_taught)
  VALUES (v_org, 'Dani Walker', 'dani.seed@example.com', '0400 100 004',
          '7 Crown St, Sydney NSW', 70, 'Sam Walker', '0400 900 004',
          ARRAY['Computer Science','Mathematics'], ARRAY[9,10,11,12])
  RETURNING id INTO v_tutor_dani;

  INSERT INTO public.tutors (organization_id, full_name, email, phone, address, pay_rate,
                             emergency_name, emergency_phone, subjects_taught, year_levels_taught)
  VALUES (v_org, 'Eli Park', 'eli.tutor.seed@example.com', '0400 100 005',
          '21 Crown St, Sydney NSW', 60, 'Jin Park', '0400 900 005',
          ARRAY['French','Spanish','English'], ARRAY[7,8,9,10,11,12])
  RETURNING id INTO v_tutor_eli;

  INSERT INTO public.tutors (organization_id, full_name, email, phone, address, pay_rate,
                             emergency_name, emergency_phone, subjects_taught, year_levels_taught)
  VALUES (v_org, 'Farah Ahmed', 'farah.seed@example.com', '0400 100 006',
          '3 Liverpool St, Sydney NSW', 75, 'Hasan Ahmed', '0400 900 006',
          ARRAY['Mathematics','Statistics','Economics'], ARRAY[10,11,12])
  RETURNING id INTO v_tutor_farah;

  -- Lookup table for the schedule grid below: indices 1..6 map to these tutors.
  -- Falls back to the new tutors when an original seed tutor is missing so the
  -- block still produces sessions on a fresh database.
  v_tutors := ARRAY[
    COALESCE(v_tutor_ava,   v_tutor_dani),
    COALESCE(v_tutor_ben,   v_tutor_eli),
    COALESCE(v_tutor_chen,  v_tutor_farah),
    v_tutor_dani,
    v_tutor_eli,
    v_tutor_farah
  ];

  -- ----------------------------------------------------------
  -- 20 new students. RETURNING preserves VALUES order in PG.
  -- ----------------------------------------------------------
  WITH ins AS (
    INSERT INTO public.students (organization_id, full_name, email, phone, grade_level,
                                 default_rate, parent_name, parent_email, parent_phone, notes)
    SELECT v_org, t.full_name, t.email, t.phone, t.grade_level, t.default_rate,
           t.parent_name, t.parent_email, t.parent_phone, t.notes
    FROM (VALUES
      (1,  'Sophie Adams',     'sophie.seed@example.com',    '0401 000 011', 7,  60, 'Jenna Adams',    'jenna.adams.seed@example.com',    '0402 000 011', NULL),
      (2,  'Lucas Bailey',     'lucas.seed@example.com',     '0401 000 012', 8,  65, 'Tom Bailey',     'tom.bailey.seed@example.com',     '0402 000 012', NULL),
      (3,  'Isla Chen',        'isla.seed@example.com',      '0401 000 013', 9,  70, 'Wei Chen',       'wei.chen.seed@example.com',       '0402 000 013', 'Prefers afternoon sessions.'),
      (4,  'Mason Doyle',      'mason.seed@example.com',     '0401 000 014', 10, 75, 'Karen Doyle',    'karen.doyle.seed@example.com',    '0402 000 014', NULL),
      (5,  'Charlotte Evans',  'charlotte.seed@example.com', '0401 000 015', 11, 80, 'Greg Evans',     'greg.evans.seed@example.com',     '0402 000 015', NULL),
      (6,  'Jack Fischer',     'jack.seed@example.com',      '0401 000 016', 12, 95, 'Helen Fischer',  'helen.fischer.seed@example.com',  '0402 000 016', 'Year 12 — exam focus.'),
      (7,  'Grace Gupta',      'grace.seed@example.com',     '0401 000 017', 8,  65, 'Anil Gupta',     'anil.gupta.seed@example.com',     '0402 000 017', NULL),
      (8,  'William Hayes',    'william.seed@example.com',   '0401 000 018', 9,  70, 'Lisa Hayes',     'lisa.hayes.seed@example.com',     '0402 000 018', NULL),
      (9,  'Ivy Ito',          'ivy.seed@example.com',       '0401 000 019', 10, 75, 'Yuki Ito',       'yuki.ito.seed@example.com',       '0402 000 019', NULL),
      (10, 'Lachlan Jones',    'lachlan.seed@example.com',   '0401 000 020', 11, 80, 'Megan Jones',    'megan.jones.seed@example.com',    '0402 000 020', NULL),
      (11, 'Harper Kim',       'harper.seed@example.com',    '0401 000 021', 12, 95, 'Joon Kim',       'joon.kim.seed@example.com',       '0402 000 021', NULL),
      (12, 'Eli Lawson',       'eli.lawson.seed@example.com','0401 000 022', 7,  60, 'Beth Lawson',    'beth.lawson.seed@example.com',    '0402 000 022', NULL),
      (13, 'Aria Murphy',      'aria.seed@example.com',      '0401 000 023', 9,  70, 'Sean Murphy',    'sean.murphy.seed@example.com',    '0402 000 023', NULL),
      (14, 'Hudson Nair',      'hudson.seed@example.com',    '0401 000 024', 10, 75, 'Anita Nair',     'anita.nair.seed@example.com',     '0402 000 024', NULL),
      (15, 'Penelope Owens',   'penelope.seed@example.com',  '0401 000 025', 11, 80, 'Tina Owens',     'tina.owens.seed@example.com',     '0402 000 025', NULL),
      (16, 'Theo Patel',       'theo.seed@example.com',      '0401 000 026', 12, 95, 'Neel Patel',     'neel.patel.seed@example.com',     '0402 000 026', NULL),
      (17, 'Stella Quinn',     'stella.seed@example.com',    '0401 000 027', 8,  65, 'Marcus Quinn',   'marcus.quinn.seed@example.com',   '0402 000 027', NULL),
      (18, 'Leo Reed',         'leo.seed@example.com',       '0401 000 028', 9,  70, 'Patty Reed',     'patty.reed.seed@example.com',     '0402 000 028', NULL),
      (19, 'Maya Sato',        'maya.seed@example.com',      '0401 000 029', 11, 80, 'Aki Sato',       'aki.sato.seed@example.com',       '0402 000 029', NULL),
      (20, 'Felix Turner',     'felix.seed@example.com',     '0401 000 030', 12, 95, 'Donna Turner',   'donna.turner.seed@example.com',   '0402 000 030', NULL)
    ) AS t(ord, full_name, email, phone, grade_level, default_rate,
           parent_name, parent_email, parent_phone, notes)
    ORDER BY t.ord
    RETURNING id
  )
  SELECT array_agg(id) INTO v_student_ids FROM ins;

  -- ----------------------------------------------------------
  -- 6 more resources
  -- ----------------------------------------------------------
  WITH rins AS (
    INSERT INTO public.resources (organization_id, title, subject, grade_level, url, notes)
    SELECT v_org, r.title, r.subject, r.grade_level, r.url, r.notes
    FROM (VALUES
      (1, 'Calculus Limits Workbook',   'Mathematics',      12, 'https://example.com/resources/calc-limits.pdf',     NULL),
      (2, 'French Verbs Cheatsheet',    'French',           9,  'https://example.com/resources/french-verbs.pdf',    NULL),
      (3, 'Python Basics Notebook',     'Computer Science', 10, 'https://example.com/resources/python-basics.ipynb', 'Run cells in order.'),
      (4, 'Macroeconomics Glossary',    'Economics',        11, 'https://example.com/resources/macro-glossary.pdf',  NULL),
      (5, 'Probability Practice Set',   'Statistics',       11, 'https://example.com/resources/probability.pdf',     NULL),
      (6, 'Shakespeare Themes Guide',   'English',          12, 'https://example.com/resources/shakespeare.pdf',     NULL)
    ) AS r(ord, title, subject, grade_level, url, notes)
    ORDER BY r.ord
    RETURNING id
  )
  SELECT array_agg(id) INTO v_resource_ids FROM rins;

  -- ----------------------------------------------------------
  -- Tutor availabilities — 3 weekday slots per new tutor.
  -- ----------------------------------------------------------
  INSERT INTO public.availabilities (organization_id, owner_type, tutor_id,
                                     day_of_week, start_time_of_day, end_time_of_day)
  VALUES
    (v_org, 'tutor', v_tutor_dani,  1, '15:00', '19:00'),
    (v_org, 'tutor', v_tutor_dani,  3, '15:00', '19:00'),
    (v_org, 'tutor', v_tutor_dani,  5, '15:00', '18:00'),
    (v_org, 'tutor', v_tutor_eli,   2, '15:00', '19:00'),
    (v_org, 'tutor', v_tutor_eli,   4, '15:00', '19:00'),
    (v_org, 'tutor', v_tutor_eli,   6, '10:00', '13:00'),
    (v_org, 'tutor', v_tutor_farah, 1, '15:00', '20:00'),
    (v_org, 'tutor', v_tutor_farah, 4, '15:00', '20:00'),
    (v_org, 'tutor', v_tutor_farah, 6, '09:00', '12:00');

  -- A handful of student availabilities (one slot each, every other student)
  FOR i IN 1..array_length(v_student_ids, 1) LOOP
    IF i % 2 = 0 THEN
      INSERT INTO public.availabilities (organization_id, owner_type, student_id,
                                         day_of_week, start_time_of_day, end_time_of_day)
      VALUES (v_org, 'student', v_student_ids[i],
              ((i % 5) + 1)::smallint,
              (time '15:00' + ((i % 3) * interval '1 hour'))::time,
              (time '17:00' + ((i % 3) * interval '1 hour'))::time);
    END IF;
  END LOOP;

  -- ----------------------------------------------------------
  -- Sessions across 7 weeks (-5..-1 = past, 1..2 = future).
  -- For each week, schedule the 14 slots in the lockstep arrays.
  -- Past weeks: ~80% completed, ~10% cancelled_billable, ~10% cancelled_free.
  -- Future weeks: scheduled.
  -- One student per session, cycled deterministically so no student is
  -- in two sessions at the same wall-clock time.
  -- ----------------------------------------------------------
  v_n_slots := array_length(v_t_idx, 1);

  FOR v_w IN -5..2 LOOP
    IF v_w = 0 THEN CONTINUE; END IF;          -- skip current week (v1 seed owns it)
    FOR i IN 1..v_n_slots LOOP
      v_tutor    := v_tutors[v_t_idx[i]];
      IF v_tutor IS NULL THEN CONTINUE; END IF;
      v_student  := v_student_ids[((v_w + 5) * v_n_slots + i - 1) % array_length(v_student_ids, 1) + 1];
      v_pay_rate := 55 + (v_t_idx[i] * 5);

      IF v_w < 0 THEN
        -- Past: weighted status
        v_status := CASE
          WHEN ((i + v_w) % 10) IN (0)         THEN 'cancelled_free'
          WHEN ((i + v_w) % 10) IN (1)         THEN 'cancelled_billable'
          ELSE 'completed'
        END;
      ELSE
        v_status := 'scheduled';
      END IF;

      INSERT INTO public.sessions (
        organization_id, tutor_id, start_time, end_time, topic, status,
        cancellation_reason, tutor_pay_rate
      ) VALUES (
        v_org, v_tutor,
        ((v_mon + (v_w * 7) + v_day[i]) + v_start[i]) AT TIME ZONE 'Australia/Sydney',
        ((v_mon + (v_w * 7) + v_day[i]) + v_start[i] + interval '1 hour') AT TIME ZONE 'Australia/Sydney',
        v_topic[i], v_status,
        CASE WHEN v_status LIKE 'cancelled%' THEN 'Family commitment' END,
        v_pay_rate
      ) RETURNING id INTO v_sid;

      INSERT INTO public.session_students (session_id, student_id, rate)
        VALUES (v_sid, v_student, 60 + ((i + v_t_idx[i]) % 5) * 10);

      -- Occasionally attach a resource for flavour
      IF i % 4 = 0 THEN
        INSERT INTO public.session_resources (session_id, resource_id, student_id, notes)
        VALUES (v_sid,
                v_resource_ids[((i + v_w + 6) % array_length(v_resource_ids, 1)) + 1],
                v_student,
                'Auto-attached by seed');
      END IF;
    END LOOP;
  END LOOP;

  -- Vary attendance for completed sessions: ~10% late, ~5% absent.
  UPDATE public.attendance a SET status = 'late', marked_at = now()
   FROM public.sessions s
   WHERE a.session_id = s.id
     AND s.organization_id = v_org
     AND s.status = 'completed'
     AND s.start_time < now()
     AND (extract(epoch FROM s.start_time)::bigint % 11) = 0;

  UPDATE public.attendance a SET status = 'absent', marked_at = now()
   FROM public.sessions s
   WHERE a.session_id = s.id
     AND s.organization_id = v_org
     AND s.status = 'completed'
     AND s.start_time < now()
     AND (extract(epoch FROM s.start_time)::bigint % 17) = 0;

  -- ----------------------------------------------------------
  -- Payments: 1–3 prepaid top-ups per student over the past 60d.
  -- ----------------------------------------------------------
  FOR i IN 1..array_length(v_student_ids, 1) LOOP
    INSERT INTO public.payments (organization_id, student_id, amount, method, description, payment_date)
    VALUES (v_org, v_student_ids[i],
            150 + ((i * 37) % 200),
            (ARRAY['bank_transfer','payid','cash','card','other'])[((i % 5) + 1)],
            'Seed: prepaid top-up',
            CURRENT_DATE - ((i * 3) % 45));

    IF i % 3 = 0 THEN
      INSERT INTO public.payments (organization_id, student_id, amount, method, description, payment_date)
      VALUES (v_org, v_student_ids[i],
              200 + ((i * 17) % 150),
              'bank_transfer',
              'Seed: follow-up top-up',
              CURRENT_DATE - ((i * 7) % 30));
    END IF;
  END LOOP;

  -- ----------------------------------------------------------
  -- Invoices: every 3rd student gets one of each status flavour.
  -- Statuses cycled: draft, sent, partial, paid, void.
  -- ----------------------------------------------------------
  FOR i IN 1..array_length(v_student_ids, 1) LOOP
    v_status := (ARRAY['draft','sent','partial','paid','void'])[((i % 5) + 1)];
    v_amount := 240 + ((i * 23) % 360);
    SELECT public.next_invoice_number(v_org) INTO v_inv_no;

    INSERT INTO public.invoices (
      organization_id, student_id, invoice_number, issue_date, due_date,
      amount, status, sent_at, paid_at, notes
    ) VALUES (
      v_org, v_student_ids[i], v_inv_no,
      CURRENT_DATE - ((i * 4) % 50),
      CURRENT_DATE - ((i * 4) % 50) + 14,
      v_amount, v_status,
      CASE WHEN v_status IN ('sent','partial','paid','void')
           THEN (CURRENT_DATE - ((i * 4) % 50) + 1)::timestamptz END,
      CASE WHEN v_status = 'paid'
           THEN (CURRENT_DATE - ((i * 4) % 50) + 7)::timestamptz END,
      'Seed invoice'
    ) RETURNING id INTO v_iid;

    -- Reconcile partial / paid invoices against an existing payment.
    IF v_status IN ('partial','paid') THEN
      SELECT id INTO v_pid FROM public.payments
        WHERE student_id = v_student_ids[i] ORDER BY payment_date DESC LIMIT 1;
      IF v_pid IS NOT NULL THEN
        INSERT INTO public.invoice_payments (invoice_id, payment_id, amount)
        VALUES (v_iid, v_pid,
                CASE WHEN v_status = 'paid' THEN v_amount ELSE v_amount / 2 END)
        ON CONFLICT (invoice_id, payment_id) DO NOTHING;
      END IF;
    END IF;
  END LOOP;

  -- ----------------------------------------------------------
  -- Extra expenses spread across the last 90 days
  -- ----------------------------------------------------------
  INSERT INTO public.expenses (organization_id, amount, category, description, expense_date)
  VALUES
    (v_org,  84.50, 'materials', 'Seed: workbooks bulk order', CURRENT_DATE - 70),
    (v_org,  29.00, 'software',  'Seed: design tool',           CURRENT_DATE - 55),
    (v_org, 220.00, 'rent',      'Seed: room hire (May)',       CURRENT_DATE - 40),
    (v_org,  18.40, 'travel',    'Seed: travel to student',     CURRENT_DATE - 30),
    (v_org, 450.00, 'tutor_pay', 'Seed: fortnightly tutor pay', CURRENT_DATE - 21),
    (v_org,  62.00, 'materials', 'Seed: stationery',            CURRENT_DATE - 14),
    (v_org, 199.00, 'software',  'Seed: AI tooling',            CURRENT_DATE - 9),
    (v_org,  35.00, 'other',     'Seed: misc',                  CURRENT_DATE - 4);

  RAISE NOTICE 'Seed extension v2 inserted for org % (% students total).',
    v_org, (SELECT count(*) FROM public.students WHERE organization_id = v_org);
END $$;


