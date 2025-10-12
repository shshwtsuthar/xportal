BEGIN;

-- This seed file populates the database with Certificate III in Carpentry program data
-- including program, subjects, timetable, program plans (2025 & 2026), and classes

-- Check if RTO exists before proceeding
DO $$
DECLARE
    rto_exists boolean;
BEGIN
    -- Check if any RTO exists
    SELECT EXISTS(SELECT 1 FROM public.rtos LIMIT 1) INTO rto_exists;
    
    IF NOT rto_exists THEN
        RAISE EXCEPTION 'No RTO found. Please run seed-first-admin.ts first or create an RTO manually.';
    END IF;
    
    RAISE NOTICE 'Found existing RTO, proceeding with data seeding...';
END $$;

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
    ('CPCWHS3001', '2025-02-10', '2025-02-16', 2),
    ('CPCCCA2011*', '2025-02-17', '2025-02-23', 3),
    ('CPCCCA2002*', '2025-02-24', '2025-03-16', 4),
    ('CPCCOM1012', '2025-03-17', '2025-03-23', 5),
    ('CPCCCA3002*', '2025-03-24', '2025-03-30', 6),
    ('CPCCCA3003*', '2025-03-31', '2025-04-06', 7),
    ('CPCCCA3004*', '2025-04-07', '2025-04-20', 8),
    ('CPCCCA3005*', '2025-04-21', '2025-04-27', 9),
    ('CPCCCA3006*', '2025-05-05', '2025-05-11', 10),
    ('CPCCCA3007*', '2025-05-12', '2025-05-25', 11),
    ('CPCCCA3008*', '2025-05-26', '2025-06-01', 12),
    ('CPCCCA3010*', '2025-06-02', '2025-06-22', 13),
    ('CPCCCA3016*', '2025-06-23', '2025-06-29', 14),
    ('CPCCCA3017*', '2025-06-30', '2025-07-06', 15),
    ('CPCCCA3024*', '2025-07-07', '2025-07-20', 16),
    ('CPCCCA3025*', '2025-07-21', '2025-07-27', 17),
    ('CPCCCA3028*', '2025-08-04', '2025-08-17', 18),
    ('CPCCCM2006', '2025-08-18', '2025-08-24', 19),
    ('CPCCCM2008*', '2025-08-25', '2025-08-31', 20),
    ('CPCCCO2013*', '2025-09-01', '2025-09-07', 21),
    ('CPCCOM1014', '2025-09-08', '2025-09-14', 22),
    ('CPCCOM3001', '2025-09-15', '2025-09-21', 23),
    ('CPCCOM1015', '2025-09-22', '2025-09-28', 24),
    ('CPCCOM3006', '2025-09-29', '2025-10-05', 25),
    ('CPCCCM3005', '2025-10-06', '2025-10-12', 26),
    ('CPCCCA3012*', '2025-10-13', '2025-10-19', 27),
    ('CPCCCM2002*', '2025-10-20', '2025-10-26', 28),
    ('CPCCCA3014*', '2025-11-03', '2025-11-16', 29),
    ('CPCCJN3003', '2025-11-17', '2025-12-07', 30),
    ('CPCCSF2004', '2025-12-08', '2025-12-21', 31),
    ('CPCCCA3001*', '2025-12-29', '2026-01-11', 32),
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
    ('CPCWHS3001', '2026-02-09', '2026-02-15', 2),
    ('CPCCCA2011*', '2026-02-16', '2026-02-22', 3),
    ('CPCCCA2002*', '2026-02-23', '2026-03-15', 4),
    ('CPCCOM1012', '2026-03-16', '2026-03-22', 5),
    ('CPCCCA3002*', '2026-03-23', '2026-03-29', 6),
    ('CPCCCA3003*', '2026-03-30', '2026-04-05', 7),
    ('CPCCCA3004*', '2026-04-06', '2026-04-19', 8),
    ('CPCCCA3005*', '2026-04-20', '2026-04-26', 9),
    ('CPCCCA3006*', '2026-05-04', '2026-05-10', 10),
    ('CPCCCA3007*', '2026-05-11', '2026-05-24', 11),
    ('CPCCCA3008*', '2026-05-25', '2026-05-31', 12),
    ('CPCCCA3010*', '2026-06-01', '2026-06-21', 13),
    ('CPCCCA3016*', '2026-06-22', '2026-06-28', 14),
    ('CPCCCA3017*', '2026-06-29', '2026-07-05', 15),
    ('CPCCCA3024*', '2026-07-06', '2026-07-19', 16),
    ('CPCCCA3025*', '2026-07-20', '2026-07-26', 17),
    ('CPCCCA3028*', '2026-08-03', '2026-08-16', 18),
    ('CPCCCM2006', '2026-08-17', '2026-08-23', 19),
    ('CPCCCM2008*', '2026-08-24', '2026-08-30', 20),
    ('CPCCCO2013*', '2026-08-31', '2026-09-06', 21),
    ('CPCCOM1014', '2026-09-07', '2026-09-13', 22),
    ('CPCCOM3001', '2026-09-14', '2026-09-20', 23),
    ('CPCCOM1015', '2026-09-21', '2026-09-27', 24),
    ('CPCCOM3006', '2026-09-28', '2026-10-04', 25),
    ('CPCCCM3005', '2026-10-05', '2026-10-11', 26),
    ('CPCCCA3012*', '2026-10-12', '2026-10-18', 27),
    ('CPCCCM2002*', '2026-10-19', '2026-10-25', 28),
    ('CPCCCA3014*', '2026-11-02', '2026-11-15', 29),
    ('CPCCJN3003', '2026-11-16', '2026-12-06', 30),
    ('CPCCSF2004', '2026-12-07', '2026-12-20', 31),
    ('CPCCCA3001*', '2026-12-28', '2027-01-10', 32),
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

  -- Cleanup
  DROP TABLE temp_subjects;

  RAISE NOTICE 'Seed completed successfully!';
  RAISE NOTICE 'Program ID: %', v_program_id;
  RAISE NOTICE 'Timetable ID: %', v_timetable_id;
  RAISE NOTICE 'Program Plan 2025 ID: %', v_program_plan_2025_id;
  RAISE NOTICE 'Program Plan 2026 ID: %', v_program_plan_2026_id;

END $$;

COMMIT;

