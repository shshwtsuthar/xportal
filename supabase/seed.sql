BEGIN;

-- This seed file populates the database with Certificate III in Carpentry program data
-- including program, subjects, timetable, program plans (2025 & 2026), and classes

-- Ensure an initial RTO exists even with RLS enabled
SELECT public.seed_initial_data();

-- Step 1: Get the RTO ID (assumes first RTO in the system)
DO $$
DECLARE
  v_rto_id UUID;
  v_program_id UUID;
  v_timetable_id UUID;
  v_program_plan_2025_id UUID;
  v_program_plan_2026_id UUID;
  v_subject_id UUID;
  v_program_plan_subject_id UUID;
  v_payment_plan_template_id UUID;
BEGIN
  -- Get first RTO
  SELECT id INTO v_rto_id FROM public.rtos LIMIT 1;
  
  IF v_rto_id IS NULL THEN
    RAISE EXCEPTION 'No RTO found. Please create an RTO first.';
  END IF;

  -- Step 2: Ensure lookup values exist
  INSERT INTO public.program_levels (id, label) VALUES ('514', 'Certificate III') ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.program_recognitions (id, label) VALUES ('11', 'Nationally Recognised') ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.program_fields (id, label) VALUES 
    ('0803', 'Business & Management'),
    ('0401', 'Architecture and Building')
  ON CONFLICT (id) DO NOTHING;

  -- Step 3: Create the Certificate III in Carpentry program
  INSERT INTO public.programs (
    id,
    rto_id,
    code,
    name,
    level_of_education_id,
    recognition_id,
    vet_flag,
    field_of_education_id,
    nominal_hours
  ) VALUES (
    extensions.uuid_generate_v4(),
    v_rto_id,
    'CPC32220',
    'Certificate III in Carpentry',
    '514',  -- Certificate III
    '11',   -- Nationally Recognised
    'Y',    -- VET program
    '0401', -- Architecture and Building
    1680    -- Total nominal hours (sum of all subjects)
  ) 
  ON CONFLICT (rto_id, code) DO UPDATE SET
    name = EXCLUDED.name,
    level_of_education_id = EXCLUDED.level_of_education_id,
    recognition_id = EXCLUDED.recognition_id,
    vet_flag = EXCLUDED.vet_flag,
    field_of_education_id = EXCLUDED.field_of_education_id,
    nominal_hours = EXCLUDED.nominal_hours
  RETURNING id INTO v_program_id;

  RAISE NOTICE 'Program created/updated: %', v_program_id;

  -- Step 4: Create all subjects (units of competency)
  -- Helper function to insert or get subject
  CREATE TEMP TABLE temp_subjects (
    code TEXT PRIMARY KEY,
    name TEXT,
    hours INT,
    subject_id UUID
  );

  -- Insert all unique subjects
  INSERT INTO temp_subjects (code, name, hours) VALUES
    ('CPCCWHS2001', 'Apply WHS requirements, policies and procedures in the construction industry', 20),
    ('CPCWHS3001', 'Identify construction work hazards and select risk control strategies', 20),
    ('CPCCCA2011', 'Handle carpentry materials', 20),
    ('CPCCCA2002', 'Use carpentry tools and equipment', 60),
    ('CPCCOM1012', 'Work effectively and sustainably in the construction industry', 20),
    ('CPCCCA3002', 'Carry out setting out', 20),
    ('CPCCCA3003', 'Install flooring systems', 20),
    ('CPCCCA3004', 'Construct and erect wall frames', 40),
    ('CPCCCA3005', 'Construct ceiling frames', 20),
    ('CPCCCA3006', 'Erect roof trusses', 20),
    ('CPCCCA3007', 'Construct pitched roofs', 40),
    ('CPCCCA3008', 'Construct eaves', 20),
    ('CPCCCA3010', 'Install windows and doors', 60),
    ('CPCCCA3016', 'Construct, assemble and install timber external stairs', 20),
    ('CPCCCA3017', 'Install exterior cladding', 20),
    ('CPCCCA3024', 'Install lining, panelling and moulding', 40),
    ('CPCCCA3025', 'Read and interpret plans, specifications and drawings for carpentry work', 20),
    ('CPCCCA3028', 'Erect and dismantle formwork for footings and slabs on ground', 40),
    ('CPCCCM2006', 'Apply basic levelling procedures', 20),
    ('CPCCCM2008', 'Erect and dismantle restricted height scaffolding', 20),
    ('CPCCCO2013', 'Carry out concreting to simple forms', 20),
    ('CPCCOM1014', 'Conduct workplace communication', 20),
    ('CPCCOM3001', 'Perform construction calculations to determine carpentry material requirements', 20),
    ('CPCCOM1015', 'Carry out measurements and calculations', 20),
    ('CPCCOM3006', 'Carry out levelling operations', 20),
    ('CPCCCM3005', 'Calculate cost of construction work', 20),
    ('CPCCCA3012', 'Frame and fit wet area fixtures', 20),
    ('CPCCCM2002', 'Carry out hand excavation', 20),
    ('CPCCCA3014', 'Construct and install bulkheads', 40),
    ('CPCCJN3003', 'Manufacture components for doors, windows and frames', 60),
    ('CPCCSF2004', 'Place and fix reinforcement materials', 40),
    ('CPCCCA3001', 'Carry out general demolition of minor building structures', 40),
    ('CPCCCM2012', 'Work safely at heights', 40),
    ('CPCCOM1013', 'Plan and organise work', 20);

  -- Insert subjects and store their IDs
  FOR v_subject_id IN
    INSERT INTO public.subjects (
      rto_id,
      code,
      name,
      nominal_hours,
      field_of_education_id,
      vet_flag
    )
    SELECT 
      v_rto_id,
      code,
      name,
      hours,
      '0401', -- Architecture and Building
      'Y'     -- VET flag
    FROM temp_subjects
    ON CONFLICT (rto_id, code) DO UPDATE SET
      name = EXCLUDED.name,
      nominal_hours = EXCLUDED.nominal_hours
    RETURNING id
  LOOP
    NULL; -- Just to allow the loop
  END LOOP;

  -- Update temp table with actual subject IDs
  UPDATE temp_subjects ts
  SET subject_id = s.id
  FROM public.subjects s
  WHERE s.code = ts.code AND s.rto_id = v_rto_id;

  RAISE NOTICE 'Subjects created/updated: % subjects', (SELECT COUNT(*) FROM temp_subjects);

  -- Step 5: Create Timetable
  INSERT INTO public.timetables (
    id,
    rto_id,
    program_id,
    name,
    is_archived
  ) VALUES (
    extensions.uuid_generate_v4(),
    v_rto_id,
    v_program_id,
    'Certificate III in Carpentry 2025-2026',
    false
  )
  ON CONFLICT ON CONSTRAINT timetables_pkey DO NOTHING
  RETURNING id INTO v_timetable_id;

  -- If conflict, get existing timetable
  IF v_timetable_id IS NULL THEN
    SELECT id INTO v_timetable_id 
    FROM public.timetables 
    WHERE program_id = v_program_id 
    AND name = 'Certificate III in Carpentry 2025-2026'
    LIMIT 1;
  END IF;

  RAISE NOTICE 'Timetable created/updated: %', v_timetable_id;

  -- Step 6: Create Program Plan 2025
  INSERT INTO public.program_plans (
    id,
    rto_id,
    program_id,
    name
  ) VALUES (
    extensions.uuid_generate_v4(),
    v_rto_id,
    v_program_id,
    'Intake 2025'
  )
  ON CONFLICT (program_id, name) DO NOTHING
  RETURNING id INTO v_program_plan_2025_id;

  -- If conflict, get existing program plan
  IF v_program_plan_2025_id IS NULL THEN
    SELECT id INTO v_program_plan_2025_id 
    FROM public.program_plans 
    WHERE program_id = v_program_id 
    AND name = 'Intake 2025'
    LIMIT 1;
  END IF;

  RAISE NOTICE 'Program Plan 2025 created/updated: %', v_program_plan_2025_id;

  -- Step 7: Add subjects to Program Plan 2025
  INSERT INTO public.program_plan_subjects (program_plan_id, subject_id, start_date, end_date, sequence_order, is_prerequisite)
  SELECT 
    v_program_plan_2025_id,
    (SELECT subject_id FROM temp_subjects WHERE code = REPLACE(data.code, '*', '')),
    data.start_date::date,
    data.end_date::date,
    data.seq,
    data.code LIKE '%*' -- Mark subjects with * as prerequisites
  FROM (VALUES
    ('CPCCWHS2001*', '2025-02-03', '2025-02-09', 1),
    ('CPCWHS3001*', '2025-02-10', '2025-02-16', 2),
    ('CPCCCA2011', '2025-02-17', '2025-02-23', 3),
    ('CPCCCA2002', '2025-02-24', '2025-03-16', 4),
    ('CPCCOM1012', '2025-03-17', '2025-03-23', 5),
    ('CPCCCA3002', '2025-03-24', '2025-03-30', 6),
    ('CPCCCA3003', '2025-03-31', '2025-04-06', 7),
    ('CPCCCA3004', '2025-04-07', '2025-04-20', 8),
    ('CPCCCA3005', '2025-04-21', '2025-04-27', 9),
    ('CPCCCA3006', '2025-05-05', '2025-05-11', 10),
    ('CPCCCA3007', '2025-05-12', '2025-05-25', 11),
    ('CPCCCA3008', '2025-05-26', '2025-06-01', 12),
    ('CPCCCA3010', '2025-06-02', '2025-06-22', 13),
    ('CPCCCA3016', '2025-06-23', '2025-06-29', 14),
    ('CPCCCA3017', '2025-06-30', '2025-07-06', 15),
    ('CPCCCA3024', '2025-07-07', '2025-07-20', 16),
    ('CPCCCA3025', '2025-07-21', '2025-07-27', 17),
    ('CPCCCA3028', '2025-08-04', '2025-08-17', 18),
    ('CPCCCM2006', '2025-08-18', '2025-08-24', 19),
    ('CPCCCM2008', '2025-08-25', '2025-08-31', 20),
    ('CPCCCO2013', '2025-09-01', '2025-09-07', 21),
    ('CPCCOM1014', '2025-09-08', '2025-09-14', 22),
    ('CPCCOM3001', '2025-09-15', '2025-09-21', 23),
    ('CPCCOM1015', '2025-09-22', '2025-09-28', 24),
    ('CPCCOM3006', '2025-09-29', '2025-10-05', 25),
    ('CPCCCM3005', '2025-10-06', '2025-10-12', 26),
    ('CPCCCA3012', '2025-10-13', '2025-10-19', 27),
    ('CPCCCM2002', '2025-10-20', '2025-10-26', 28),
    ('CPCCCA3014', '2025-11-03', '2025-11-16', 29),
    ('CPCCJN3003', '2025-11-17', '2025-12-07', 30),
    ('CPCCSF2004', '2025-12-08', '2025-12-21', 31),
    ('CPCCCA3001', '2025-12-29', '2026-01-11', 32),
    ('CPCCCM2012', '2026-01-12', '2026-01-25', 33),
    ('CPCCOM1013', '2026-01-26', '2026-02-01', 34)
  ) AS data(code, start_date, end_date, seq)
  ON CONFLICT (program_plan_id, subject_id, start_date) DO NOTHING;

  RAISE NOTICE 'Program Plan 2025 subjects added';

  -- Step 8: Add classes for Program Plan 2025
  INSERT INTO public.program_plan_classes (
    program_plan_subject_id,
    class_date,
    start_time,
    end_time,
    class_type,
    notes
  )
  SELECT 
    pps.id,
    pps.start_date,
    '09:00:00'::time,
    '17:00:00'::time,
    'THEORY'::class_type,
    'Standard theory class'
  FROM public.program_plan_subjects pps
  WHERE pps.program_plan_id = v_program_plan_2025_id;

  RAISE NOTICE 'Program Plan 2025 classes added';

  -- Step 9: Create Program Plan 2026
  INSERT INTO public.program_plans (
    id,
    rto_id,
    program_id,
    name
  ) VALUES (
    extensions.uuid_generate_v4(),
    v_rto_id,
    v_program_id,
    'Intake 2026'
  )
  ON CONFLICT (program_id, name) DO NOTHING
  RETURNING id INTO v_program_plan_2026_id;

  -- If conflict, get existing program plan
  IF v_program_plan_2026_id IS NULL THEN
    SELECT id INTO v_program_plan_2026_id 
    FROM public.program_plans 
    WHERE program_id = v_program_id 
    AND name = 'Intake 2026'
    LIMIT 1;
  END IF;

  RAISE NOTICE 'Program Plan 2026 created/updated: %', v_program_plan_2026_id;

  -- Step 10: Add subjects to Program Plan 2026
  INSERT INTO public.program_plan_subjects (program_plan_id, subject_id, start_date, end_date, sequence_order, is_prerequisite)
  SELECT 
    v_program_plan_2026_id,
    (SELECT subject_id FROM temp_subjects WHERE code = REPLACE(data.code, '*', '')),
    data.start_date::date,
    data.end_date::date,
    data.seq,
    data.code LIKE '%*' -- Mark subjects with * as prerequisites
  FROM (VALUES
    ('CPCCWHS2001*', '2026-02-02', '2026-02-08', 1),
    ('CPCWHS3001*', '2026-02-09', '2026-02-15', 2),
    ('CPCCCA2011', '2026-02-16', '2026-02-22', 3),
    ('CPCCCA2002', '2026-02-23', '2026-03-15', 4),
    ('CPCCOM1012', '2026-03-16', '2026-03-22', 5),
    ('CPCCCA3002', '2026-03-23', '2026-03-29', 6),
    ('CPCCCA3003', '2026-03-30', '2026-04-05', 7),
    ('CPCCCA3004', '2026-04-06', '2026-04-19', 8),
    ('CPCCCA3005', '2026-04-20', '2026-04-26', 9),
    ('CPCCCA3006', '2026-05-04', '2026-05-10', 10),
    ('CPCCCA3007', '2026-05-11', '2026-05-24', 11),
    ('CPCCCA3008', '2026-05-25', '2026-05-31', 12),
    ('CPCCCA3010', '2026-06-01', '2026-06-21', 13),
    ('CPCCCA3016', '2026-06-22', '2026-06-28', 14),
    ('CPCCCA3017', '2026-06-29', '2026-07-05', 15),
    ('CPCCCA3024', '2026-07-06', '2026-07-19', 16),
    ('CPCCCA3025', '2026-07-20', '2026-07-26', 17),
    ('CPCCCA3028', '2026-08-03', '2026-08-16', 18),
    ('CPCCCM2006', '2026-08-17', '2026-08-23', 19),
    ('CPCCCM2008', '2026-08-24', '2026-08-30', 20),
    ('CPCCCO2013', '2026-08-31', '2026-09-06', 21),
    ('CPCCOM1014', '2026-09-07', '2026-09-13', 22),
    ('CPCCOM3001', '2026-09-14', '2026-09-20', 23),
    ('CPCCOM1015', '2026-09-21', '2026-09-27', 24),
    ('CPCCOM3006', '2026-09-28', '2026-10-04', 25),
    ('CPCCCM3005', '2026-10-05', '2026-10-11', 26),
    ('CPCCCA3012', '2026-10-12', '2026-10-18', 27),
    ('CPCCCM2002', '2026-10-19', '2026-10-25', 28),
    ('CPCCCA3014', '2026-11-02', '2026-11-15', 29),
    ('CPCCJN3003', '2026-11-16', '2026-12-06', 30),
    ('CPCCSF2004', '2026-12-07', '2026-12-20', 31),
    ('CPCCCA3001', '2026-12-28', '2027-01-10', 32),
    ('CPCCCM2012', '2027-01-11', '2027-01-24', 33),
    ('CPCCOM1013', '2027-01-25', '2027-01-31', 34)
  ) AS data(code, start_date, end_date, seq)
  ON CONFLICT (program_plan_id, subject_id, start_date) DO NOTHING;

  RAISE NOTICE 'Program Plan 2026 subjects added';

  -- Step 11: Add classes for Program Plan 2026
  INSERT INTO public.program_plan_classes (
    program_plan_subject_id,
    class_date,
    start_time,
    end_time,
    class_type,
    notes
  )
  SELECT 
    pps.id,
    pps.start_date,
    '09:00:00'::time,
    '17:00:00'::time,
    'THEORY'::class_type,
    'Standard theory class'
  FROM public.program_plan_subjects pps
  WHERE pps.program_plan_id = v_program_plan_2026_id;

  RAISE NOTICE 'Program Plan 2026 classes added';

  -- Step 12: Link program plans to timetable via junction table
  INSERT INTO public.timetable_program_plans (timetable_id, program_plan_id)
  VALUES 
    (v_timetable_id, v_program_plan_2025_id),
    (v_timetable_id, v_program_plan_2026_id)
  ON CONFLICT (timetable_id, program_plan_id) DO NOTHING;

  RAISE NOTICE 'Program plans linked to timetable';

  -- Step 13: Create Payment Plan Template for Certificate III in Carpentry
  INSERT INTO public.payment_plan_templates (
    id,
    rto_id,
    program_id,
    name,
    is_default
  ) VALUES (
    extensions.uuid_generate_v4(),
    v_rto_id,
    v_program_id,
    'Standard Payment Plan',
    true
  )
  ON CONFLICT (rto_id, program_id) WHERE is_default = true DO UPDATE SET
    name = EXCLUDED.name
  RETURNING id INTO v_payment_plan_template_id;

  RAISE NOTICE 'Payment Plan Template created: %', v_payment_plan_template_id;

  -- Step 14: Add installments to payment plan template
  INSERT INTO public.payment_plan_template_installments (
    template_id,
    name,
    amount_cents,
    due_date_rule_days
  ) VALUES
    (v_payment_plan_template_id, '1st Installment', 75000, 0),
    (v_payment_plan_template_id, 'Enrolment Fee', 25000, 0),
    (v_payment_plan_template_id, 'Promotional Material Price 1 CPC', 50000, 0),
    (v_payment_plan_template_id, '2nd installment', 75000, 35),
    (v_payment_plan_template_id, 'Promotional Material Fees 2 CPC', 50000, 35),
    (v_payment_plan_template_id, '3rd Installment', 90000, 63),
    (v_payment_plan_template_id, 'Promotional Material Price 3 CPC', 50000, 63),
    (v_payment_plan_template_id, '4th Installment', 90000, 94),
    (v_payment_plan_template_id, 'Promotional Material Price 4 CPC', 25000, 94),
    (v_payment_plan_template_id, '5th Installment', 90000, 124),
    (v_payment_plan_template_id, '6th Installment', 90000, 155),
    (v_payment_plan_template_id, '7th Installment', 90000, 185),
    (v_payment_plan_template_id, '8th Installment', 90000, 216),
    (v_payment_plan_template_id, '9th Installment', 90000, 247),
    (v_payment_plan_template_id, '10th Installment', 90000, 277),
    (v_payment_plan_template_id, '11th Installment', 90000, 308),
    (v_payment_plan_template_id, '12th Installment', 90000, 338);

  RAISE NOTICE 'Payment Plan Template installments added: 17 installments';

  -- Cleanup
  DROP TABLE temp_subjects;

  RAISE NOTICE 'Seed completed successfully!';
  RAISE NOTICE 'Program ID: %', v_program_id;
  RAISE NOTICE 'Timetable ID: %', v_timetable_id;
  RAISE NOTICE 'Program Plan 2025 ID: %', v_program_plan_2025_id;
  RAISE NOTICE 'Program Plan 2026 ID: %', v_program_plan_2026_id;

END $$;

COMMIT;


-- =============================================
-- Extended Comprehensive Seed (Infrastructure, Programs, Agents, Apps, Students)
-- Idempotent and safe to re-run
-- =============================================
BEGIN;

DO $$
DECLARE
  v_rto_id UUID;
  v_admin_id UUID;

  -- Locations
  v_loc1_id UUID;
  v_loc2_id UUID;

  -- Classrooms
  v_cls1_id UUID;
  v_cls2_id UUID;
  v_cls3_id UUID;
  v_cls4_id UUID;
  v_cls5_id UUID;

  -- Programs
  v_prog_it_id UUID;
  v_prog_bus_id UUID;
  v_prog_hosp_id UUID;

  -- Timetables
  v_tt_it_id UUID;
  v_tt_bus_id UUID;
  v_tt_hosp_id UUID;

  -- Program Plans
  v_pp_it_2025_id UUID;
  v_pp_it_2026_id UUID;
  v_pp_bus_2025_id UUID;
  v_pp_bus_2026_id UUID;
  v_pp_hosp_2025_id UUID;
  v_pp_hosp_2026_id UUID;

  -- Payment templates
  v_tpl_it_id UUID;
  v_tpl_bus_id UUID;
  v_tpl_hosp_id UUID;

  -- Helpers
  v_tmp_id UUID;
  v_count INT;
BEGIN
  -- Resolve core ids
  SELECT id INTO v_rto_id FROM public.rtos LIMIT 1;
  IF v_rto_id IS NULL THEN
    RAISE EXCEPTION 'RTO not found. Run seed_initial_data first.';
  END IF;

  -- Get admin profile, create if missing
  SELECT id INTO v_admin_id FROM public.profiles WHERE role = 'ADMIN' LIMIT 1;
  IF v_admin_id IS NULL THEN
    -- Check if admin user exists in auth.users but profile is missing
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = 'shshwtsuthar@gmail.com') THEN
      -- Create profile for existing admin user
      INSERT INTO public.profiles (id, rto_id, role, first_name, last_name)
      SELECT id, v_rto_id, 'ADMIN', 'Shashwat', 'Suthar'
      FROM auth.users WHERE email = 'shshwtsuthar@gmail.com'
      RETURNING id INTO v_admin_id;
    ELSE
      RAISE EXCEPTION 'Admin user not found. Run seed-first-admin.ts first.';
    END IF;
  END IF;

  -- ---------------------------------------------
  -- Lookups (idempotent inserts)
  -- ---------------------------------------------
  -- Program Levels (additions)
  INSERT INTO public.program_levels (id, label) VALUES
    ('421', 'Certificate IV'),
    ('420', 'Diploma'),
    ('410', 'Advanced Diploma')
  ON CONFLICT (id) DO NOTHING;

  -- Program Fields (additions)
  INSERT INTO public.program_fields (id, label) VALUES
    ('0201', 'Information Technology'),
    ('0613', 'Business and Management (Advanced)'),
    ('1101', 'Hospitality Management')
  ON CONFLICT (id) DO NOTHING;

  -- Program Recognitions (ensure)
  INSERT INTO public.program_recognitions (id, label) VALUES
    ('11', 'Nationally Recognised')
  ON CONFLICT (id) DO NOTHING;

  -- ---------------------------------------------
  -- Delivery Locations (2) - insert-if-not-exists by (rto_id, location_id_internal)
  -- ---------------------------------------------
  IF NOT EXISTS (
    SELECT 1 FROM public.delivery_locations WHERE rto_id = v_rto_id AND location_id_internal = 'MEL-CBD'
  ) THEN
    INSERT INTO public.delivery_locations (
      id, rto_id, location_id_internal, name, suburb, state, postcode, building_property_name, flat_unit_details, street_number, street_name
    ) VALUES (
      extensions.uuid_generate_v4(), v_rto_id, 'MEL-CBD', 'Melbourne CBD Campus', 'Melbourne', 'VIC', '3000', 'Tower One', NULL, '101', 'Collins Street'
    ) RETURNING id INTO v_loc1_id;
  ELSE
    SELECT id INTO v_loc1_id FROM public.delivery_locations WHERE rto_id = v_rto_id AND location_id_internal = 'MEL-CBD' LIMIT 1;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.delivery_locations WHERE rto_id = v_rto_id AND location_id_internal = 'SUB-CTR'
  ) THEN
    INSERT INTO public.delivery_locations (
      id, rto_id, location_id_internal, name, suburb, state, postcode, building_property_name, flat_unit_details, street_number, street_name
    ) VALUES (
      extensions.uuid_generate_v4(), v_rto_id, 'SUB-CTR', 'Suburban Training Centre', 'Clayton', 'VIC', '3168', NULL, 'Unit 5', '12', 'Princes Hwy'
    ) RETURNING id INTO v_loc2_id;
  ELSE
    SELECT id INTO v_loc2_id FROM public.delivery_locations WHERE rto_id = v_rto_id AND location_id_internal = 'SUB-CTR' LIMIT 1;
  END IF;

  -- ---------------------------------------------
  -- Classrooms (2-3 per location)
  -- ---------------------------------------------
  -- Location 1 classrooms
  IF NOT EXISTS (
    SELECT 1 FROM public.classrooms WHERE rto_id = v_rto_id AND location_id = v_loc1_id AND name = 'Room 101'
  ) THEN
    INSERT INTO public.classrooms (id, rto_id, location_id, name, type, capacity, status, description)
    VALUES (extensions.uuid_generate_v4(), v_rto_id, v_loc1_id, 'Room 101', 'CLASSROOM', 30, 'AVAILABLE', 'Main lecture hall') RETURNING id INTO v_cls1_id;
  ELSE SELECT id INTO v_cls1_id FROM public.classrooms WHERE rto_id = v_rto_id AND location_id = v_loc1_id AND name = 'Room 101' LIMIT 1; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.classrooms WHERE rto_id = v_rto_id AND location_id = v_loc1_id AND name = 'Computer Lab A'
  ) THEN
    INSERT INTO public.classrooms (id, rto_id, location_id, name, type, capacity, status, description)
    VALUES (extensions.uuid_generate_v4(), v_rto_id, v_loc1_id, 'Computer Lab A', 'COMPUTER_LAB', 24, 'AVAILABLE', 'IT lab with 24 workstations') RETURNING id INTO v_cls2_id;
  ELSE SELECT id INTO v_cls2_id FROM public.classrooms WHERE rto_id = v_rto_id AND location_id = v_loc1_id AND name = 'Computer Lab A' LIMIT 1; END IF;

  -- Location 2 classrooms
  IF NOT EXISTS (
    SELECT 1 FROM public.classrooms WHERE rto_id = v_rto_id AND location_id = v_loc2_id AND name = 'Workshop 1'
  ) THEN
    INSERT INTO public.classrooms (id, rto_id, location_id, name, type, capacity, status, description)
    VALUES (extensions.uuid_generate_v4(), v_rto_id, v_loc2_id, 'Workshop 1', 'WORKSHOP', 20, 'AVAILABLE', 'Hands-on workshop') RETURNING id INTO v_cls3_id;
  ELSE SELECT id INTO v_cls3_id FROM public.classrooms WHERE rto_id = v_rto_id AND location_id = v_loc2_id AND name = 'Workshop 1' LIMIT 1; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.classrooms WHERE rto_id = v_rto_id AND location_id = v_loc2_id AND name = 'Room 201'
  ) THEN
    INSERT INTO public.classrooms (id, rto_id, location_id, name, type, capacity, status, description)
    VALUES (extensions.uuid_generate_v4(), v_rto_id, v_loc2_id, 'Room 201', 'CLASSROOM', 28, 'AVAILABLE', NULL) RETURNING id INTO v_cls4_id;
  ELSE SELECT id INTO v_cls4_id FROM public.classrooms WHERE rto_id = v_rto_id AND location_id = v_loc2_id AND name = 'Room 201' LIMIT 1; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.classrooms WHERE rto_id = v_rto_id AND location_id = v_loc2_id AND name = 'Computer Lab B'
  ) THEN
    INSERT INTO public.classrooms (id, rto_id, location_id, name, type, capacity, status, description)
    VALUES (extensions.uuid_generate_v4(), v_rto_id, v_loc2_id, 'Computer Lab B', 'COMPUTER_LAB', 22, 'AVAILABLE', NULL) RETURNING id INTO v_cls5_id;
  ELSE SELECT id INTO v_cls5_id FROM public.classrooms WHERE rto_id = v_rto_id AND location_id = v_loc2_id AND name = 'Computer Lab B' LIMIT 1; END IF;

  -- ---------------------------------------------
  -- Agents (12+) - insert-if-not-exists by slug per RTO
  -- ---------------------------------------------
  PERFORM 1;
  -- Use a VALUES list and loop
  FOR v_tmp_id IN SELECT NULL LOOP
    -- Excellence Education Australia
    IF NOT EXISTS (SELECT 1 FROM public.agents WHERE rto_id = v_rto_id AND slug = 'excellence-education-australia') THEN
      INSERT INTO public.agents (id, rto_id, name, contact_person, contact_email, contact_phone, slug)
      VALUES (extensions.uuid_generate_v4(), v_rto_id, 'Excellence Education Australia', 'Alice Brown', 'contact@excellence.edu.au', '+61 3 9000 1111', 'excellence-education-australia');
    END IF;
    -- Global Pathways Consulting
    IF NOT EXISTS (SELECT 1 FROM public.agents WHERE rto_id = v_rto_id AND slug = 'global-pathways-consulting') THEN
      INSERT INTO public.agents (id, rto_id, name, contact_person, contact_email, contact_phone, slug)
      VALUES (extensions.uuid_generate_v4(), v_rto_id, 'Global Pathways Consulting', 'Rahul Verma', 'info@globalpathways.com', '+61 2 8111 2222', 'global-pathways-consulting');
    END IF;
    -- Sydney Student Services
    IF NOT EXISTS (SELECT 1 FROM public.agents WHERE rto_id = v_rto_id AND slug = 'sydney-student-services') THEN
      INSERT INTO public.agents (id, rto_id, name, contact_person, contact_email, contact_phone, slug)
      VALUES (extensions.uuid_generate_v4(), v_rto_id, 'Sydney Student Services', 'Tom Lee', 'support@sydstudent.com.au', '+61 2 9000 3333', 'sydney-student-services');
    END IF;
    -- Melbourne Overseas Education
    IF NOT EXISTS (SELECT 1 FROM public.agents WHERE rto_id = v_rto_id AND slug = 'melbourne-overseas-education') THEN
      INSERT INTO public.agents (id, rto_id, name, contact_person, contact_email, contact_phone, slug)
      VALUES (extensions.uuid_generate_v4(), v_rto_id, 'Melbourne Overseas Education', 'Harpreet Singh', 'hello@moe.com.au', '+61 3 9555 4444', 'melbourne-overseas-education');
    END IF;
    -- Brisbane Connect
    IF NOT EXISTS (SELECT 1 FROM public.agents WHERE rto_id = v_rto_id AND slug = 'brisbane-connect') THEN
      INSERT INTO public.agents (id, rto_id, name, contact_person, contact_email, contact_phone, slug)
      VALUES (extensions.uuid_generate_v4(), v_rto_id, 'Brisbane Connect', 'Sarah White', 'enquiries@brisconnect.au', '+61 7 3222 5555', 'brisbane-connect');
    END IF;
    -- Perth Gateway
    IF NOT EXISTS (SELECT 1 FROM public.agents WHERE rto_id = v_rto_id AND slug = 'perth-gateway') THEN
      INSERT INTO public.agents (id, rto_id, name, contact_person, contact_email, contact_phone, slug)
      VALUES (extensions.uuid_generate_v4(), v_rto_id, 'Perth Gateway', 'James Wilson', 'team@perthgateway.com', '+61 8 6111 6666', 'perth-gateway');
    END IF;
    -- Adelaide Academics
    IF NOT EXISTS (SELECT 1 FROM public.agents WHERE rto_id = v_rto_id AND slug = 'adelaide-academics') THEN
      INSERT INTO public.agents (id, rto_id, name, contact_person, contact_email, contact_phone, slug)
      VALUES (extensions.uuid_generate_v4(), v_rto_id, 'Adelaide Academics', 'Priya Nair', 'contact@adelaideacademics.com', '+61 8 7000 7777', 'adelaide-academics');
    END IF;
    -- Gold Coast Ed
    IF NOT EXISTS (SELECT 1 FROM public.agents WHERE rto_id = v_rto_id AND slug = 'gold-coast-ed') THEN
      INSERT INTO public.agents (id, rto_id, name, contact_person, contact_email, contact_phone, slug)
      VALUES (extensions.uuid_generate_v4(), v_rto_id, 'Gold Coast Ed', 'Lucas Martin', 'hello@goldcoasted.au', '+61 7 5555 8888', 'gold-coast-ed');
    END IF;
    -- Canberra Student Hub
    IF NOT EXISTS (SELECT 1 FROM public.agents WHERE rto_id = v_rto_id AND slug = 'canberra-student-hub') THEN
      INSERT INTO public.agents (id, rto_id, name, contact_person, contact_email, contact_phone, slug)
      VALUES (extensions.uuid_generate_v4(), v_rto_id, 'Canberra Student Hub', 'Nina Park', 'support@canberrahub.au', '+61 2 6111 9999', 'canberra-student-hub');
    END IF;
    -- Hobart Education Link
    IF NOT EXISTS (SELECT 1 FROM public.agents WHERE rto_id = v_rto_id AND slug = 'hobart-education-link') THEN
      INSERT INTO public.agents (id, rto_id, name, contact_person, contact_email, contact_phone, slug)
      VALUES (extensions.uuid_generate_v4(), v_rto_id, 'Hobart Education Link', 'Olivia Cooper', 'team@hobartlink.edu.au', '+61 3 6222 0000', 'hobart-education-link');
    END IF;
    -- Darwin Student Services
    IF NOT EXISTS (SELECT 1 FROM public.agents WHERE rto_id = v_rto_id AND slug = 'darwin-student-services') THEN
      INSERT INTO public.agents (id, rto_id, name, contact_person, contact_email, contact_phone, slug)
      VALUES (extensions.uuid_generate_v4(), v_rto_id, 'Darwin Student Services', 'Mia Johnson', 'contact@darwinstudents.au', '+61 8 8000 1212', 'darwin-student-services');
    END IF;
    -- Geelong Global
    IF NOT EXISTS (SELECT 1 FROM public.agents WHERE rto_id = v_rto_id AND slug = 'geelong-global') THEN
      INSERT INTO public.agents (id, rto_id, name, contact_person, contact_email, contact_phone, slug)
      VALUES (extensions.uuid_generate_v4(), v_rto_id, 'Geelong Global', 'Arun Sharma', 'info@geelongglobal.com.au', '+61 3 5222 3434', 'geelong-global');
    END IF;
    EXIT; -- run once
  END LOOP;

  -- ---------------------------------------------
  -- Programs (3 additional) with subjects, plans, classes, timetables, templates
  -- ---------------------------------------------
  -- Certificate IV in Information Technology
  INSERT INTO public.programs (
    id, rto_id, code, name, level_of_education_id, recognition_id, vet_flag, field_of_education_id, nominal_hours
  ) VALUES (
    extensions.uuid_generate_v4(), v_rto_id, 'ICT40120', 'Certificate IV in Information Technology', '421', '11', 'Y', '0201', 1200
  ) ON CONFLICT (rto_id, code) DO UPDATE SET
    name = EXCLUDED.name, level_of_education_id = EXCLUDED.level_of_education_id,
    recognition_id = EXCLUDED.recognition_id, vet_flag = EXCLUDED.vet_flag,
    field_of_education_id = EXCLUDED.field_of_education_id, nominal_hours = EXCLUDED.nominal_hours
  RETURNING id INTO v_prog_it_id;

  -- Diploma of Business
  INSERT INTO public.programs (
    id, rto_id, code, name, level_of_education_id, recognition_id, vet_flag, field_of_education_id, nominal_hours
  ) VALUES (
    extensions.uuid_generate_v4(), v_rto_id, 'BSB50120', 'Diploma of Business', '420', '11', 'Y', '0803', 900
  ) ON CONFLICT (rto_id, code) DO UPDATE SET
    name = EXCLUDED.name, level_of_education_id = EXCLUDED.level_of_education_id,
    recognition_id = EXCLUDED.recognition_id, vet_flag = EXCLUDED.vet_flag,
    field_of_education_id = EXCLUDED.field_of_education_id, nominal_hours = EXCLUDED.nominal_hours
  RETURNING id INTO v_prog_bus_id;

  -- Advanced Diploma of Hospitality Management
  INSERT INTO public.programs (
    id, rto_id, code, name, level_of_education_id, recognition_id, vet_flag, field_of_education_id, nominal_hours
  ) VALUES (
    extensions.uuid_generate_v4(), v_rto_id, 'SIT60322', 'Advanced Diploma of Hospitality Management', '410', '11', 'Y', '1101', 1300
  ) ON CONFLICT (rto_id, code) DO UPDATE SET
    name = EXCLUDED.name, level_of_education_id = EXCLUDED.level_of_education_id,
    recognition_id = EXCLUDED.recognition_id, vet_flag = EXCLUDED.vet_flag,
    field_of_education_id = EXCLUDED.field_of_education_id, nominal_hours = EXCLUDED.nominal_hours
  RETURNING id INTO v_prog_hosp_id;

  -- Subjects for each program (insert-if-not-exists by code)
  -- IT subjects
  WITH s(code, name, hours) AS (
    VALUES
      ('ICTICT443', 'Work and collaborate in a virtual environment', 40),
      ('ICTSAS432', 'Identify and resolve client ICT problems', 60),
      ('ICTNWK420', 'Install and configure virtual machines', 60),
      ('ICTSAS436', 'Evaluate ICT system functionality', 40),
      ('ICTWEB431', 'Create and implement basic website designs', 60),
      ('ICTWEB452', 'Create dynamic web pages', 80),
      ('ICTPRG431', 'Apply query language in relational DBs', 60),
      ('ICTPRG437', 'Build a user interface', 60),
      ('ICTICT426', 'Identify and evaluate emerging technologies', 40),
      ('ICTICT451', 'Comply with IP, ethics and privacy', 20)
  )
  INSERT INTO public.subjects (id, rto_id, code, name, nominal_hours, field_of_education_id, vet_flag)
  SELECT extensions.uuid_generate_v4(), v_rto_id, code, name, hours, '0201', 'Y' FROM s
  ON CONFLICT (rto_id, code) DO UPDATE SET name = EXCLUDED.name, nominal_hours = EXCLUDED.nominal_hours;

  -- Business subjects
  WITH s(code, name, hours) AS (
    VALUES
      ('BSBCRT511', 'Develop critical thinking in others', 40),
      ('BSBOPS501', 'Manage business resources', 60),
      ('BSBPEF501', 'Manage personal and professional development', 40),
      ('BSBXCM501', 'Lead communication in the workplace', 40),
      ('BSBMKG541', 'Identify and evaluate marketing opportunities', 60),
      ('BSBFIN501', 'Manage budgets and financial plans', 60),
      ('BSBOPS502', 'Manage business operational plans', 60),
      ('BSBPMG430', 'Undertake project work', 60),
      ('BSBLDR523', 'Lead and manage effective workplace relationships', 60),
      ('BSBSTR502', 'Facilitate continuous improvement', 40)
  )
  INSERT INTO public.subjects (id, rto_id, code, name, nominal_hours, field_of_education_id, vet_flag)
  SELECT extensions.uuid_generate_v4(), v_rto_id, code, name, hours, '0803', 'Y' FROM s
  ON CONFLICT (rto_id, code) DO UPDATE SET name = EXCLUDED.name, nominal_hours = EXCLUDED.nominal_hours;

  -- Hospitality subjects
  WITH s(code, name, hours) AS (
    VALUES
      ('SITXCCS016', 'Develop and manage quality customer service practices', 60),
      ('SITXFIN010', 'Prepare and monitor budgets', 60),
      ('SITXHRM010', 'Recruit, select and induct staff', 50),
      ('SITXMGT005', 'Establish and conduct business relationships', 50),
      ('SITXWHS008', 'Establish and maintain a work health and safety system', 40),
      ('SITXGLC002', 'Identify and manage legal risks and comply with law', 50),
      ('SITXCOM010', 'Manage conflict', 40),
      ('SITXCCS015', 'Enhance customer service experiences', 40),
      ('SITHIND006', 'Source and use information on the hospitality industry', 40),
      ('SITXMPR011', 'Plan and implement sales activities', 60)
  )
  INSERT INTO public.subjects (id, rto_id, code, name, nominal_hours, field_of_education_id, vet_flag)
  SELECT extensions.uuid_generate_v4(), v_rto_id, code, name, hours, '1101', 'Y' FROM s
  ON CONFLICT (rto_id, code) DO UPDATE SET name = EXCLUDED.name, nominal_hours = EXCLUDED.nominal_hours;

  -- Program plans (2025, 2026) for each program
  -- IT
  INSERT INTO public.program_plans (id, rto_id, program_id, name)
  VALUES (extensions.uuid_generate_v4(), v_rto_id, v_prog_it_id, 'Intake 2025')
  ON CONFLICT (program_id, name) DO NOTHING RETURNING id INTO v_pp_it_2025_id;
  IF v_pp_it_2025_id IS NULL THEN SELECT id INTO v_pp_it_2025_id FROM public.program_plans WHERE program_id = v_prog_it_id AND name = 'Intake 2025' LIMIT 1; END IF;

  INSERT INTO public.program_plans (id, rto_id, program_id, name)
  VALUES (extensions.uuid_generate_v4(), v_rto_id, v_prog_it_id, 'Intake 2026')
  ON CONFLICT (program_id, name) DO NOTHING RETURNING id INTO v_pp_it_2026_id;
  IF v_pp_it_2026_id IS NULL THEN SELECT id INTO v_pp_it_2026_id FROM public.program_plans WHERE program_id = v_prog_it_id AND name = 'Intake 2026' LIMIT 1; END IF;

  -- Business
  INSERT INTO public.program_plans (id, rto_id, program_id, name)
  VALUES (extensions.uuid_generate_v4(), v_rto_id, v_prog_bus_id, 'Intake 2025')
  ON CONFLICT (program_id, name) DO NOTHING RETURNING id INTO v_pp_bus_2025_id;
  IF v_pp_bus_2025_id IS NULL THEN SELECT id INTO v_pp_bus_2025_id FROM public.program_plans WHERE program_id = v_prog_bus_id AND name = 'Intake 2025' LIMIT 1; END IF;

  INSERT INTO public.program_plans (id, rto_id, program_id, name)
  VALUES (extensions.uuid_generate_v4(), v_rto_id, v_prog_bus_id, 'Intake 2026')
  ON CONFLICT (program_id, name) DO NOTHING RETURNING id INTO v_pp_bus_2026_id;
  IF v_pp_bus_2026_id IS NULL THEN SELECT id INTO v_pp_bus_2026_id FROM public.program_plans WHERE program_id = v_prog_bus_id AND name = 'Intake 2026' LIMIT 1; END IF;

  -- Hospitality
  INSERT INTO public.program_plans (id, rto_id, program_id, name)
  VALUES (extensions.uuid_generate_v4(), v_rto_id, v_prog_hosp_id, 'Intake 2025')
  ON CONFLICT (program_id, name) DO NOTHING RETURNING id INTO v_pp_hosp_2025_id;
  IF v_pp_hosp_2025_id IS NULL THEN SELECT id INTO v_pp_hosp_2025_id FROM public.program_plans WHERE program_id = v_prog_hosp_id AND name = 'Intake 2025' LIMIT 1; END IF;

  INSERT INTO public.program_plans (id, rto_id, program_id, name)
  VALUES (extensions.uuid_generate_v4(), v_rto_id, v_prog_hosp_id, 'Intake 2026')
  ON CONFLICT (program_id, name) DO NOTHING RETURNING id INTO v_pp_hosp_2026_id;
  IF v_pp_hosp_2026_id IS NULL THEN SELECT id INTO v_pp_hosp_2026_id FROM public.program_plans WHERE program_id = v_prog_hosp_id AND name = 'Intake 2026' LIMIT 1; END IF;

  -- Program plan subjects: lay out weekly schedule blocks per program for 2025
  -- IT plan (2025)
  INSERT INTO public.program_plan_subjects (program_plan_id, subject_id, start_date, end_date, sequence_order, is_prerequisite)
  SELECT v_pp_it_2025_id, s.id, d.start_date, d.end_date, d.seq, (d.seq <= 2)
  FROM public.subjects s
  JOIN (
    SELECT 1 AS seq, DATE '2025-02-03' AS start_date, DATE '2025-02-16' AS end_date UNION ALL
    SELECT 2, DATE '2025-02-17', DATE '2025-03-02' UNION ALL
    SELECT 3, DATE '2025-03-03', DATE '2025-03-16' UNION ALL
    SELECT 4, DATE '2025-03-17', DATE '2025-03-30' UNION ALL
    SELECT 5, DATE '2025-03-31', DATE '2025-04-13' UNION ALL
    SELECT 6, DATE '2025-04-14', DATE '2025-04-27' UNION ALL
    SELECT 7, DATE '2025-04-28', DATE '2025-05-11' UNION ALL
    SELECT 8, DATE '2025-05-12', DATE '2025-05-25' UNION ALL
    SELECT 9, DATE '2025-05-26', DATE '2025-06-08' UNION ALL
    SELECT 10, DATE '2025-06-09', DATE '2025-06-22'
  ) d ON s.rto_id = v_rto_id AND s.code IN ('ICTICT443','ICTSAS432','ICTNWK420','ICTSAS436','ICTWEB431','ICTWEB452','ICTPRG431','ICTPRG437','ICTICT426','ICTICT451')
  ORDER BY s.code
  ON CONFLICT (program_plan_id, subject_id, start_date) DO NOTHING;

  -- Business plan (2025)
  INSERT INTO public.program_plan_subjects (program_plan_id, subject_id, start_date, end_date, sequence_order, is_prerequisite)
  SELECT v_pp_bus_2025_id, s.id, d.start_date, d.end_date, d.seq, (d.seq <= 2)
  FROM public.subjects s
  JOIN (
    SELECT 1 AS seq, DATE '2025-02-03' AS start_date, DATE '2025-02-16' AS end_date UNION ALL
    SELECT 2, DATE '2025-02-17', DATE '2025-03-02' UNION ALL
    SELECT 3, DATE '2025-03-03', DATE '2025-03-16' UNION ALL
    SELECT 4, DATE '2025-03-17', DATE '2025-03-30' UNION ALL
    SELECT 5, DATE '2025-03-31', DATE '2025-04-13' UNION ALL
    SELECT 6, DATE '2025-04-14', DATE '2025-04-27' UNION ALL
    SELECT 7, DATE '2025-04-28', DATE '2025-05-11' UNION ALL
    SELECT 8, DATE '2025-05-12', DATE '2025-05-25' UNION ALL
    SELECT 9, DATE '2025-05-26', DATE '2025-06-08' UNION ALL
    SELECT 10, DATE '2025-06-09', DATE '2025-06-22'
  ) d ON s.rto_id = v_rto_id AND s.code IN ('BSBCRT511','BSBOPS501','BSBPEF501','BSBXCM501','BSBMKG541','BSBFIN501','BSBOPS502','BSBPMG430','BSBLDR523','BSBSTR502')
  ORDER BY s.code
  ON CONFLICT (program_plan_id, subject_id, start_date) DO NOTHING;

  -- Hospitality plan (2025)
  INSERT INTO public.program_plan_subjects (program_plan_id, subject_id, start_date, end_date, sequence_order, is_prerequisite)
  SELECT v_pp_hosp_2025_id, s.id, d.start_date, d.end_date, d.seq, (d.seq <= 2)
  FROM public.subjects s
  JOIN (
    SELECT 1 AS seq, DATE '2025-02-03' AS start_date, DATE '2025-02-16' AS end_date UNION ALL
    SELECT 2, DATE '2025-02-17', DATE '2025-03-02' UNION ALL
    SELECT 3, DATE '2025-03-03', DATE '2025-03-16' UNION ALL
    SELECT 4, DATE '2025-03-17', DATE '2025-03-30' UNION ALL
    SELECT 5, DATE '2025-03-31', DATE '2025-04-13' UNION ALL
    SELECT 6, DATE '2025-04-14', DATE '2025-04-27' UNION ALL
    SELECT 7, DATE '2025-04-28', DATE '2025-05-11' UNION ALL
    SELECT 8, DATE '2025-05-12', DATE '2025-05-25' UNION ALL
    SELECT 9, DATE '2025-05-26', DATE '2025-06-08' UNION ALL
    SELECT 10, DATE '2025-06-09', DATE '2025-06-22'
  ) d ON s.rto_id = v_rto_id AND s.code IN ('SITXCCS016','SITXFIN010','SITXHRM010','SITXMGT005','SITXWHS008','SITXGLC002','SITXCOM010','SITXCCS015','SITHIND006','SITXMPR011')
  ORDER BY s.code
  ON CONFLICT (program_plan_id, subject_id, start_date) DO NOTHING;

  -- Program plan classes: one theory class per subject on its start date (09:00-17:00)
  INSERT INTO public.program_plan_classes (
    program_plan_subject_id, class_date, start_time, end_time, class_type, trainer_id, location_id, classroom_id, notes
  )
  SELECT pps.id, pps.start_date, '09:00:00'::time, '17:00:00'::time, 'THEORY', v_admin_id, v_loc1_id, v_cls1_id, 'Standard theory class'
  FROM public.program_plan_subjects pps
  WHERE pps.program_plan_id IN (v_pp_it_2025_id, v_pp_bus_2025_id, v_pp_hosp_2025_id)
  ON CONFLICT DO NOTHING;

  -- Timetables for each program and link plans
  INSERT INTO public.timetables (id, rto_id, program_id, name, is_archived)
  VALUES (extensions.uuid_generate_v4(), v_rto_id, v_prog_it_id, 'IT 2025-2026', false)
  ON CONFLICT ON CONSTRAINT timetables_pkey DO NOTHING RETURNING id INTO v_tt_it_id;
  IF v_tt_it_id IS NULL THEN SELECT id INTO v_tt_it_id FROM public.timetables WHERE program_id = v_prog_it_id AND name = 'IT 2025-2026' LIMIT 1; END IF;

  INSERT INTO public.timetables (id, rto_id, program_id, name, is_archived)
  VALUES (extensions.uuid_generate_v4(), v_rto_id, v_prog_bus_id, 'Business 2025-2026', false)
  ON CONFLICT ON CONSTRAINT timetables_pkey DO NOTHING RETURNING id INTO v_tt_bus_id;
  IF v_tt_bus_id IS NULL THEN SELECT id INTO v_tt_bus_id FROM public.timetables WHERE program_id = v_prog_bus_id AND name = 'Business 2025-2026' LIMIT 1; END IF;

  INSERT INTO public.timetables (id, rto_id, program_id, name, is_archived)
  VALUES (extensions.uuid_generate_v4(), v_rto_id, v_prog_hosp_id, 'Hospitality 2025-2026', false)
  ON CONFLICT ON CONSTRAINT timetables_pkey DO NOTHING RETURNING id INTO v_tt_hosp_id;
  IF v_tt_hosp_id IS NULL THEN SELECT id INTO v_tt_hosp_id FROM public.timetables WHERE program_id = v_prog_hosp_id AND name = 'Hospitality 2025-2026' LIMIT 1; END IF;

  INSERT INTO public.timetable_program_plans (timetable_id, program_plan_id)
  VALUES (v_tt_it_id, v_pp_it_2025_id), (v_tt_bus_id, v_pp_bus_2025_id), (v_tt_hosp_id, v_pp_hosp_2025_id)
  ON CONFLICT (timetable_id, program_plan_id) DO NOTHING;

  -- Payment Plan Templates per program (default)
  INSERT INTO public.payment_plan_templates (id, rto_id, program_id, name, is_default)
  VALUES (extensions.uuid_generate_v4(), v_rto_id, v_prog_it_id, 'IT Standard Plan', true)
  ON CONFLICT (rto_id, program_id) WHERE is_default = true DO UPDATE SET name = EXCLUDED.name RETURNING id INTO v_tpl_it_id;

  INSERT INTO public.payment_plan_templates (id, rto_id, program_id, name, is_default)
  VALUES (extensions.uuid_generate_v4(), v_rto_id, v_prog_bus_id, 'Business Standard Plan', true)
  ON CONFLICT (rto_id, program_id) WHERE is_default = true DO UPDATE SET name = EXCLUDED.name RETURNING id INTO v_tpl_bus_id;

  INSERT INTO public.payment_plan_templates (id, rto_id, program_id, name, is_default)
  VALUES (extensions.uuid_generate_v4(), v_rto_id, v_prog_hosp_id, 'Hospitality Standard Plan', true)
  ON CONFLICT (rto_id, program_id) WHERE is_default = true DO UPDATE SET name = EXCLUDED.name RETURNING id INTO v_tpl_hosp_id;

  -- Template installments (10 per template)
  WITH rows(template_id, name, amount, days) AS (
    SELECT v_tpl_it_id, 'Installment 1', 75000, 0 UNION ALL
    SELECT v_tpl_it_id, 'Installment 2', 75000, 30 UNION ALL
    SELECT v_tpl_it_id, 'Installment 3', 90000, 60 UNION ALL
    SELECT v_tpl_it_id, 'Installment 4', 90000, 90 UNION ALL
    SELECT v_tpl_it_id, 'Installment 5', 90000, 120 UNION ALL
    SELECT v_tpl_it_id, 'Installment 6', 90000, 150 UNION ALL
    SELECT v_tpl_it_id, 'Installment 7', 90000, 180 UNION ALL
    SELECT v_tpl_it_id, 'Installment 8', 90000, 210 UNION ALL
    SELECT v_tpl_it_id, 'Installment 9', 90000, 240 UNION ALL
    SELECT v_tpl_it_id, 'Installment 10', 90000, 270
  )
  INSERT INTO public.payment_plan_template_installments (template_id, name, amount_cents, due_date_rule_days)
  SELECT template_id, name, amount, days FROM rows
  ON CONFLICT DO NOTHING;

  WITH rows(template_id, name, amount, days) AS (
    SELECT v_tpl_bus_id, 'Installment 1', 60000, 0 UNION ALL
    SELECT v_tpl_bus_id, 'Installment 2', 60000, 30 UNION ALL
    SELECT v_tpl_bus_id, 'Installment 3', 80000, 60 UNION ALL
    SELECT v_tpl_bus_id, 'Installment 4', 80000, 90 UNION ALL
    SELECT v_tpl_bus_id, 'Installment 5', 80000, 120 UNION ALL
    SELECT v_tpl_bus_id, 'Installment 6', 80000, 150 UNION ALL
    SELECT v_tpl_bus_id, 'Installment 7', 80000, 180 UNION ALL
    SELECT v_tpl_bus_id, 'Installment 8', 80000, 210 UNION ALL
    SELECT v_tpl_bus_id, 'Installment 9', 80000, 240 UNION ALL
    SELECT v_tpl_bus_id, 'Installment 10', 80000, 270
  )
  INSERT INTO public.payment_plan_template_installments (template_id, name, amount_cents, due_date_rule_days)
  SELECT template_id, name, amount, days FROM rows
  ON CONFLICT DO NOTHING;

  WITH rows(template_id, name, amount, days) AS (
    SELECT v_tpl_hosp_id, 'Installment 1', 70000, 0 UNION ALL
    SELECT v_tpl_hosp_id, 'Installment 2', 70000, 30 UNION ALL
    SELECT v_tpl_hosp_id, 'Installment 3', 85000, 60 UNION ALL
    SELECT v_tpl_hosp_id, 'Installment 4', 85000, 90 UNION ALL
    SELECT v_tpl_hosp_id, 'Installment 5', 85000, 120 UNION ALL
    SELECT v_tpl_hosp_id, 'Installment 6', 85000, 150 UNION ALL
    SELECT v_tpl_hosp_id, 'Installment 7', 85000, 180 UNION ALL
    SELECT v_tpl_hosp_id, 'Installment 8', 85000, 210 UNION ALL
    SELECT v_tpl_hosp_id, 'Installment 9', 85000, 240 UNION ALL
    SELECT v_tpl_hosp_id, 'Installment 10', 85000, 270
  )
  INSERT INTO public.payment_plan_template_installments (template_id, name, amount_cents, due_date_rule_days)
  SELECT template_id, name, amount, days FROM rows
  ON CONFLICT DO NOTHING;

  -- ---------------------------------------------
  -- Applications (32 total across statuses)
  -- Mostly international with 1-2 domestic
  -- ---------------------------------------------
  -- Helper: get some agent ids
  CREATE TEMP TABLE tmp_agents AS
    SELECT id FROM public.agents WHERE rto_id = v_rto_id LIMIT 12;

  -- CORRECTED APPROACH: Create all applications in DRAFT first, then simulate workflow progression
  CREATE TEMP TABLE tmp_apps (
    first_name text, last_name text, email text, dob date, is_intl boolean, program_id uuid, timetable_id uuid,
    final_status text, proposed date, agent_id uuid, seed_created_at timestamptz
  );

  -- Populate applications - all start as DRAFT, final_status indicates target status
  INSERT INTO tmp_apps
  SELECT * FROM (
    VALUES
    -- Will stay DRAFT (6)
    ('Arjun','Kumar','arjun.kumar@example.com','2002-05-12'::date,true, v_prog_it_id, v_tt_it_id,'DRAFT','2025-02-10'::date,(SELECT id FROM tmp_agents LIMIT 1),'2025-01-05 09:00:00+11'::timestamptz),
    ('Sofia','Martinez','sofia.martinez@example.com','2001-08-21',true, v_prog_bus_id, v_tt_bus_id,'DRAFT','2025-03-01',NULL,'2025-01-12 09:00:00+11'::timestamptz),
    ('Noah','Williams','noah.williams@example.com','2003-02-02',false, v_prog_hosp_id, v_tt_hosp_id,'DRAFT','2025-02-24',NULL,'2025-01-19 09:00:00+11'::timestamptz),
    ('Mia','Chen','mia.chen@example.com','2000-12-01',true, v_prog_it_id, v_tt_it_id,'DRAFT','2025-03-03',NULL,'2025-01-26 09:00:00+11'::timestamptz),
    ('Liam','Nguyen','liam.nguyen@example.com','2004-07-30',true, v_prog_bus_id, v_tt_bus_id,'DRAFT','2025-02-17',NULL,'2025-02-02 09:00:00+11'::timestamptz),
    ('Zara','Ali','zara.ali@example.com','2002-03-18',true, v_prog_hosp_id, v_tt_hosp_id,'DRAFT','2025-02-17',NULL,'2025-02-09 09:00:00+11'::timestamptz),
    -- Will become SUBMITTED (5)
    ('Daniel','Hernandez','daniel.h@example.com','2001-10-10',true, v_prog_it_id, v_tt_it_id,'SUBMITTED','2025-02-17',(SELECT id FROM tmp_agents OFFSET 1 LIMIT 1),'2025-02-16 09:00:00+11'::timestamptz),
    ('Isabella','Rossi','isabella.rossi@example.com','2000-06-22',true, v_prog_bus_id, v_tt_bus_id,'SUBMITTED','2025-03-03',(SELECT id FROM tmp_agents OFFSET 2 LIMIT 1),'2025-02-23 09:00:00+11'::timestamptz),
    ('Ethan','Johnson','ethan.j@example.com','1999-11-11',false, v_prog_hosp_id, v_tt_hosp_id,'SUBMITTED','2025-02-24',(SELECT id FROM tmp_agents OFFSET 3 LIMIT 1),'2025-03-01 09:00:00+11'::timestamptz),
    ('Hana','Yamamoto','hana.y@example.com','2002-09-15',true, v_prog_it_id, v_tt_it_id,'SUBMITTED','2025-02-24',(SELECT id FROM tmp_agents OFFSET 4 LIMIT 1),'2025-03-08 09:00:00+11'::timestamptz),
    ('Omar','Hassan','omar.hassan@example.com','2001-04-05',true, v_prog_bus_id, v_tt_bus_id,'SUBMITTED','2025-03-10',(SELECT id FROM tmp_agents OFFSET 5 LIMIT 1),'2025-03-15 09:00:00+11'::timestamptz),
    -- Will become OFFER_GENERATED (4)
    ('Lucas','Silva','lucas.silva@example.com','2000-01-09',true, v_prog_it_id, v_tt_it_id,'OFFER_GENERATED','2025-02-17',(SELECT id FROM tmp_agents OFFSET 6 LIMIT 1),'2025-03-22 09:00:00+11'::timestamptz),
    ('Ava','Brown','ava.brown@example.com','2003-03-19',true, v_prog_bus_id, v_tt_bus_id,'OFFER_GENERATED','2025-03-03',(SELECT id FROM tmp_agents OFFSET 7 LIMIT 1),'2025-03-29 09:00:00+11'::timestamptz),
    ('Yusuf','Khan','yusuf.khan@example.com','1998-12-30',true, v_prog_hosp_id, v_tt_hosp_id,'OFFER_GENERATED','2025-02-24',(SELECT id FROM tmp_agents OFFSET 8 LIMIT 1),'2025-04-05 09:00:00+10'::timestamptz),
    ('Leila','Rahman','leila.rahman@example.com','2002-02-14',true, v_prog_it_id, v_tt_it_id,'OFFER_GENERATED','2025-03-10',(SELECT id FROM tmp_agents OFFSET 9 LIMIT 1),'2025-04-12 09:00:00+10'::timestamptz),
    -- Will become OFFER_SENT (4)
    ('Chen','Wei','chen.wei@example.com','2001-07-07',true, v_prog_it_id, v_tt_it_id,'OFFER_SENT','2025-02-17',(SELECT id FROM tmp_agents OFFSET 10 LIMIT 1),'2025-04-19 09:00:00+10'::timestamptz),
    ('Amelia','Davis','amelia.davis@example.com','1999-05-25',true, v_prog_bus_id, v_tt_bus_id,'OFFER_SENT','2025-03-03',(SELECT id FROM tmp_agents OFFSET 11 LIMIT 1),'2025-04-26 09:00:00+10'::timestamptz),
    ('Priya','Shah','priya.shah@example.com','2000-10-20',true, v_prog_hosp_id, v_tt_hosp_id,'OFFER_SENT','2025-02-24',(SELECT id FROM tmp_agents LIMIT 1),'2025-05-03 09:00:00+10'::timestamptz),
    ('Mohammed','Ali','mohammed.ali@example.com','1997-01-12',true, v_prog_it_id, v_tt_it_id,'OFFER_SENT','2025-03-10',(SELECT id FROM tmp_agents OFFSET 1 LIMIT 1),'2025-05-10 09:00:00+10'::timestamptz),
    -- Will become ACCEPTED (5)
    ('Elena','Popov','elena.popov@example.com','2002-04-04',true, v_prog_it_id, v_tt_it_id,'ACCEPTED','2025-02-17',(SELECT id FROM tmp_agents OFFSET 2 LIMIT 1),'2025-05-17 09:00:00+10'::timestamptz),
    ('Diego','Garcia','diego.garcia@example.com','2001-03-03',true, v_prog_bus_id, v_tt_bus_id,'ACCEPTED','2025-03-03',(SELECT id FROM tmp_agents OFFSET 3 LIMIT 1),'2025-05-24 09:00:00+10'::timestamptz),
    ('Fatima','Zahra','fatima.zahra@example.com','1999-09-09',true, v_prog_hosp_id, v_tt_hosp_id,'ACCEPTED','2025-02-24',(SELECT id FROM tmp_agents OFFSET 4 LIMIT 1),'2025-05-31 09:00:00+10'::timestamptz),
    ('Oliver','Taylor','oliver.taylor@example.com','2000-08-18',false, v_prog_it_id, v_tt_it_id,'ACCEPTED','2025-03-10',(SELECT id FROM tmp_agents OFFSET 5 LIMIT 1),'2025-06-07 09:00:00+10'::timestamptz),
    ('Ananya','Iyer','ananya.iyer@example.com','2003-01-23',true, v_prog_bus_id, v_tt_bus_id,'ACCEPTED','2025-03-17',(SELECT id FROM tmp_agents OFFSET 6 LIMIT 1),'2025-06-14 09:00:00+10'::timestamptz),
    -- Will become APPROVED (12)
    ('Hassan','Mehdi','hassan.mehdi@example.com','1998-02-02',true, v_prog_it_id, v_tt_it_id,'APPROVED','2025-02-17',(SELECT id FROM tmp_agents OFFSET 7 LIMIT 1),'2025-06-21 09:00:00+10'::timestamptz),
    ('Sara','Ahmed','sara.ahmed@example.com','2001-01-01',true, v_prog_bus_id, v_tt_bus_id,'APPROVED','2025-03-03',(SELECT id FROM tmp_agents OFFSET 8 LIMIT 1),'2025-06-28 09:00:00+10'::timestamptz),
    ('Jun','Park','jun.park@example.com','2000-11-11',true, v_prog_hosp_id, v_tt_hosp_id,'APPROVED','2025-02-24',(SELECT id FROM tmp_agents OFFSET 9 LIMIT 1),'2025-07-05 09:00:00+10'::timestamptz),
    ('Emily','Clark','emily.clark@example.com','1999-07-07',false, v_prog_it_id, v_tt_it_id,'APPROVED','2025-03-10',(SELECT id FROM tmp_agents OFFSET 10 LIMIT 1),'2025-07-12 09:00:00+10'::timestamptz),
    ('Naveen','Rao','naveen.rao@example.com','2002-06-16',true, v_prog_bus_id, v_tt_bus_id,'APPROVED','2025-02-17',(SELECT id FROM tmp_agents OFFSET 11 LIMIT 1),'2025-07-19 09:00:00+10'::timestamptz),
    ('Katarina','Novak','katarina.novak@example.com','2001-05-05',true, v_prog_it_id, v_tt_it_id,'APPROVED','2025-02-17',(SELECT id FROM tmp_agents LIMIT 1),'2025-07-26 09:00:00+10'::timestamptz),
    ('Wei','Zhang','wei.zhang@example.com','1998-08-08',true, v_prog_bus_id, v_tt_bus_id,'APPROVED','2025-03-03',(SELECT id FROM tmp_agents OFFSET 1 LIMIT 1),'2025-08-02 09:00:00+10'::timestamptz),
    ('Ahmed','Salim','ahmed.salim@example.com','1997-09-09',true, v_prog_hosp_id, v_tt_hosp_id,'APPROVED','2025-02-24',(SELECT id FROM tmp_agents OFFSET 2 LIMIT 1),'2025-08-16 09:00:00+10'::timestamptz),
    ('Sienna','Moore','sienna.moore@example.com','2003-10-10',true, v_prog_it_id, v_tt_it_id,'APPROVED','2025-03-10',(SELECT id FROM tmp_agents OFFSET 3 LIMIT 1),'2025-08-30 09:00:00+10'::timestamptz),
    ('Aria','Wilson','aria.wilson@example.com','2002-02-12',true, v_prog_bus_id, v_tt_bus_id,'APPROVED','2025-03-17',(SELECT id FROM tmp_agents OFFSET 4 LIMIT 1),'2025-09-13 09:00:00+10'::timestamptz),
    ('Hiro','Tanaka','hiro.tanaka@example.com','1999-12-12',true, v_prog_hosp_id, v_tt_hosp_id,'APPROVED','2025-02-17',(SELECT id FROM tmp_agents OFFSET 5 LIMIT 1),'2025-10-04 09:00:00+11'::timestamptz),
    ('Riya','Kapoor','riya.kapoor@example.com','2001-03-21',true, v_prog_it_id, v_tt_it_id,'APPROVED','2025-03-03',(SELECT id FROM tmp_agents OFFSET 6 LIMIT 1),'2025-11-01 09:00:00+11'::timestamptz)
  ) AS t(first_name,last_name,email,dob,is_intl,program_id,timetable_id,final_status,proposed,agent_id,seed_created_at);

  -- Insert ALL applications as DRAFT initially
  INSERT INTO public.applications (
    id, rto_id, status, assigned_to, first_name, last_name, date_of_birth, email, is_international,
    program_id, timetable_id, proposed_commencement_date, agent_id, country_of_citizenship, passport_number,
    visa_type, visa_number, language_code, english_proficiency_code, gender, highest_school_level_id,
    indigenous_status_id, labour_force_status_id, at_school_flag, phone_number, mobile_phone, street_country,
    suburb, state, postcode, payment_plan_template_id, created_at, offer_generated_at
  )
  SELECT
    extensions.uuid_generate_v4(), v_rto_id, 'DRAFT'::public.application_status, v_admin_id, first_name, last_name, dob, email, is_intl,
    program_id, timetable_id, proposed, agent_id,
    CASE WHEN is_intl THEN 'IND' ELSE 'AUS' END,
    CASE WHEN is_intl THEN 'P' || floor(random()*100000000)::text ELSE NULL END,
    CASE WHEN is_intl THEN 'Student (subclass 500)' ELSE NULL END,
    CASE WHEN is_intl THEN 'V' || floor(random()*10000000)::text ELSE NULL END,
    CASE WHEN is_intl THEN '1201' ELSE '1201' END, -- English language code placeholder
    CASE WHEN is_intl THEN '992' ELSE NULL END, -- English proficiency code placeholder
    'X', -- gender placeholder (AVETMISS code)
    '12', -- highest school level placeholder
    '0', -- indigenous status placeholder
    '12', -- labour force status placeholder
    'N', -- at school flag
    '+61 400 000 000', '+61 400 000 001', 'AUS', 'Melbourne', 'VIC', '3000',
    CASE WHEN program_id = v_prog_it_id THEN v_tpl_it_id WHEN program_id = v_prog_bus_id THEN v_tpl_bus_id ELSE v_tpl_hosp_id END,
    ta.seed_created_at,
    NULL -- No offer generated yet
  FROM tmp_apps ta
  ON CONFLICT DO NOTHING;

  -- Step 1: Generate learning plans for ALL applications while they're still DRAFT
  PERFORM public.upsert_application_learning_plan_draft(a.id) FROM public.applications a WHERE a.status = 'DRAFT';
  
  -- Step 2: Freeze learning plans for applications that will become ACCEPTED/APPROVED
  -- (This simulates the workflow: DRAFT -> freeze -> ACCEPTED -> APPROVED)
  PERFORM public.freeze_application_learning_plan(a.id) 
  FROM public.applications a 
  JOIN tmp_apps ta ON ta.email = a.email 
  WHERE ta.final_status IN ('ACCEPTED','APPROVED');
  
  -- Step 3: Set payment anchor dates and generate payment schedules for ACCEPTED/APPROVED applications
  UPDATE public.applications 
  SET payment_anchor_date = proposed_commencement_date
  FROM tmp_apps ta 
  WHERE applications.email = ta.email 
    AND ta.final_status IN ('ACCEPTED','APPROVED');
  
  PERFORM public.freeze_application_payment_schedule(a.id) 
  FROM public.applications a 
  JOIN tmp_apps ta ON ta.email = a.email 
  WHERE ta.final_status IN ('ACCEPTED','APPROVED');
  
  -- Step 4: Simulate status progression by updating applications to their final status
  UPDATE public.applications 
  SET status = ta.final_status::public.application_status,
      offer_generated_at = CASE WHEN ta.final_status IN ('OFFER_GENERATED','OFFER_SENT','ACCEPTED','APPROVED') THEN NOW() ELSE NULL END
  FROM tmp_apps ta 
  WHERE applications.email = ta.email;

  -- APPROVED: create students, enrollments, invoices; copy learning subjects/classes
  FOR v_tmp_id IN SELECT id FROM public.applications WHERE status = 'APPROVED' LOOP
    -- Ensure student exists (idempotent check via application_id)
    IF NOT EXISTS (SELECT 1 FROM public.students WHERE application_id = v_tmp_id) THEN
      INSERT INTO public.students (id, student_id_display, rto_id, application_id, first_name, last_name, email, date_of_birth, status, created_at)
      SELECT extensions.uuid_generate_v4(), 'STU-2025-' || right(encode(digest(a.id::text, 'sha1'),'hex'),4), a.rto_id, a.id, a.first_name, a.last_name, a.email, a.date_of_birth, 'ACTIVE',
             ta.seed_created_at + INTERVAL '30 days'
      FROM public.applications a
      JOIN tmp_apps ta ON ta.email = a.email
      WHERE a.id = v_tmp_id;
    END IF;

    -- Create enrollment if not exists
    IF NOT EXISTS (
      SELECT 1 FROM public.enrollments e JOIN public.students s ON s.id = e.student_id WHERE s.application_id = v_tmp_id
    ) THEN
      INSERT INTO public.enrollments (id, student_id, program_id, rto_id, status, commencement_date, payment_plan_template_id)
      SELECT extensions.uuid_generate_v4(), s.id, a.program_id, a.rto_id, 'ACTIVE', COALESCE(a.proposed_commencement_date, CURRENT_DATE), a.payment_plan_template_id
      FROM public.applications a JOIN public.students s ON s.application_id = a.id
      WHERE a.id = v_tmp_id;
    END IF;

    -- Enrollment subjects from application snapshot
    INSERT INTO public.enrollment_subjects (
      id, enrollment_id, program_plan_subject_id, outcome_code, start_date, end_date, is_catch_up, delivery_location_id, delivery_mode_id, scheduled_hours
    )
    SELECT extensions.uuid_generate_v4(), e.id, als.program_plan_subject_id, NULL, als.planned_start_date, als.planned_end_date,
           als.is_catch_up, NULL, NULL, NULL
    FROM public.application_learning_subjects als
    JOIN public.students s ON s.application_id = als.application_id
    JOIN public.enrollments e ON e.student_id = s.id
    WHERE als.application_id = v_tmp_id
    ON CONFLICT DO NOTHING;

    -- Enrollment classes from application snapshot
    INSERT INTO public.enrollment_classes (
      id, enrollment_id, program_plan_class_id, class_date, start_time, end_time, trainer_id, location_id, classroom_id, class_type, notes
    )
    SELECT extensions.uuid_generate_v4(), e.id, alc.program_plan_class_id, alc.class_date, alc.start_time, alc.end_time,
           alc.trainer_id, alc.location_id, alc.classroom_id, alc.class_type, NULL
    FROM public.application_learning_classes alc
    JOIN public.students s ON s.application_id = alc.application_id
    JOIN public.enrollments e ON e.student_id = s.id
    WHERE alc.application_id = v_tmp_id
    ON CONFLICT DO NOTHING;

    -- Invoices from application_payment_schedule
    INSERT INTO public.invoices (
      id, enrollment_id, rto_id, status, invoice_number, issue_date, due_date, amount_due_cents, amount_paid_cents
    )
    SELECT extensions.uuid_generate_v4(), e.id, a.rto_id,
           CASE WHEN aps.sequence_order = 1 THEN 'SENT'::public.invoice_status ELSE 'SCHEDULED'::public.invoice_status END,
           'INV-2025-' || right(encode(digest(aps.id::text, 'sha1'),'hex'),6),
           CASE WHEN aps.sequence_order = 1 THEN CURRENT_DATE ELSE aps.due_date END,
           aps.due_date, aps.amount_cents, 0
    FROM public.application_payment_schedule aps
    JOIN public.applications a ON a.id = aps.application_id
    JOIN public.students s ON s.application_id = a.id
    JOIN public.enrollments e ON e.student_id = s.id
    WHERE aps.application_id = v_tmp_id
    ON CONFLICT DO NOTHING;

    -- Attendance for past classes (mark some as present)
    INSERT INTO public.enrollment_class_attendances (id, enrollment_class_id, present, marked_by, note)
    SELECT extensions.uuid_generate_v4(), ec.id, (random() > 0.2), v_admin_id, 'Auto-marked in seed'
    FROM public.enrollment_classes ec
    WHERE ec.class_date < CURRENT_DATE AND NOT EXISTS (
      SELECT 1 FROM public.enrollment_class_attendances a WHERE a.enrollment_class_id = ec.id
    );
  END LOOP;

  -- ---------------------------------------------
  -- Assignments: create 2 per subject for IT program and a few submissions
  -- ---------------------------------------------
  WITH it_subjects AS (
    SELECT id FROM public.subjects WHERE rto_id = v_rto_id AND code IN ('ICTWEB431','ICTWEB452','ICTPRG431','ICTPRG437')
  ), rows AS (
    SELECT id AS subject_id, 1 AS n FROM it_subjects UNION ALL
    SELECT id, 2 FROM it_subjects
  )
  INSERT INTO public.subject_assignments (
    id, rto_id, subject_id, title, description, due_date, visible_from, visible_to, file_path, file_name, created_by
  )
  SELECT extensions.uuid_generate_v4(), v_rto_id, r.subject_id,
         'Assignment ' || r.n, 'Auto-seeded assignment', CURRENT_DATE + (r.n * INTERVAL '14 days'), NOW() - INTERVAL '7 days', NOW() + INTERVAL '60 days',
         '/assignments/' || r.subject_id || '/a' || r.n || '.pdf', 'a' || r.n || '.pdf', v_admin_id
  FROM rows r
  ON CONFLICT DO NOTHING;

  -- Submissions for ~40% of students
  INSERT INTO public.student_assignment_submissions (
    id, rto_id, student_id, enrollment_id, subject_id, assignment_id, notes, file_path, file_name, grade, feedback, created_by
  )
  SELECT extensions.uuid_generate_v4(), v_rto_id, s.id, e.id, sa.subject_id, sa.id,
         'Submitted via seed', '/submissions/' || s.id || '/' || sa.id || '.pdf', sa.file_name,
         CASE WHEN random() < 0.5 THEN 'C' ELSE NULL END, 'Auto feedback', v_admin_id
  FROM public.students s
  JOIN public.enrollments e ON e.student_id = s.id
  JOIN public.subject_assignments sa ON sa.rto_id = v_rto_id
  WHERE random() < 0.4
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Extended comprehensive seed completed.';
END $$;

COMMIT;