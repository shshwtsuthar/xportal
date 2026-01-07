-- Simple seed file for test data: Locations, Groups, Programs, Subjects
-- This file creates basic test data respecting the backend architecture
-- Run this after migrations to populate test data

BEGIN;

-- Ensure an initial RTO exists (idempotent)
SELECT public.seed_initial_data();

-- Get the RTO ID (assumes first RTO in the system)
DO $$
DECLARE
  v_rto_id UUID;
  v_location_1_id UUID;
  v_location_2_id UUID;
  v_location_3_id UUID;
  v_program_1_id UUID;
  v_program_2_id UUID;
  v_subject_1_id UUID;
  v_subject_2_id UUID;
  v_subject_3_id UUID;
  v_subject_4_id UUID;
BEGIN
  -- Get first RTO
  SELECT id INTO v_rto_id FROM public.rtos LIMIT 1;
  
  IF v_rto_id IS NULL THEN
    RAISE EXCEPTION 'No RTO found. Please create an RTO first.';
  END IF;

  RAISE NOTICE 'Using RTO: %', v_rto_id;

  -- ============================================================================
  -- STEP 1: Ensure lookup values exist
  -- ============================================================================
  
  INSERT INTO public.program_levels (id, label) VALUES 
    ('514', 'Certificate III'),
    ('421', 'Diploma'),
    ('420', 'Advanced Diploma')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.program_recognitions (id, label) VALUES 
    ('11', 'Nationally Recognised'),
    ('12', 'Accredited Course')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.program_fields (id, label) VALUES 
    ('0803', 'Business & Management'),
    ('0401', 'Architecture and Building'),
    ('0201', 'Computer Science')
  ON CONFLICT (id) DO NOTHING;

  -- ============================================================================
  -- STEP 2: Create Delivery Locations
  -- ============================================================================
  
  INSERT INTO public.delivery_locations (
    rto_id,
    location_id_internal,
    name,
    street_number,
    street_name,
    suburb,
    state,
    postcode,
    building_property_name
  ) VALUES 
    (
      v_rto_id,
      'LOC001',
      'Main Campus - Geelong',
      '65',
      'Brougham Street',
      'Geelong',
      'VIC',
      '3220',
      'Level 3'
    ),
    (
      v_rto_id,
      'LOC002',
      'Melbourne CBD Campus',
      '123',
      'Collins Street',
      'Melbourne',
      'VIC',
      '3000',
      'Level 10'
    ),
    (
      v_rto_id,
      'LOC003',
      'Workshop Facility - Werribee',
      '45',
      'Industrial Drive',
      'Werribee',
      'VIC',
      '3030',
      'Building A'
    )
  ON CONFLICT (rto_id, location_id_internal) DO UPDATE SET
    name = EXCLUDED.name,
    street_number = EXCLUDED.street_number,
    street_name = EXCLUDED.street_name,
    suburb = EXCLUDED.suburb,
    state = EXCLUDED.state,
    postcode = EXCLUDED.postcode,
    building_property_name = EXCLUDED.building_property_name;

  -- Get location IDs
  SELECT id INTO v_location_1_id FROM public.delivery_locations 
    WHERE rto_id = v_rto_id AND location_id_internal = 'LOC001' LIMIT 1;
  SELECT id INTO v_location_2_id FROM public.delivery_locations 
    WHERE rto_id = v_rto_id AND location_id_internal = 'LOC002' LIMIT 1;
  SELECT id INTO v_location_3_id FROM public.delivery_locations 
    WHERE rto_id = v_rto_id AND location_id_internal = 'LOC003' LIMIT 1;

  RAISE NOTICE 'Created locations: LOC001=%, LOC002=%, LOC003=%', 
    v_location_1_id, v_location_2_id, v_location_3_id;

  -- ============================================================================
  -- STEP 3: Create Programs
  -- ============================================================================
  
  INSERT INTO public.programs (
    rto_id,
    code,
    name,
    level_of_education_id,
    recognition_id,
    vet_flag,
    field_of_education_id,
    nominal_hours
  ) VALUES 
    (
      v_rto_id,
      'CPC32220',
      'Certificate III in Carpentry',
      '514',  -- Certificate III
      '11',   -- Nationally Recognised
      'Y',    -- VET program
      '0401', -- Architecture and Building
      1680    -- Total nominal hours
    ),
    (
      v_rto_id,
      'BSB50120',
      'Diploma of Business',
      '421',  -- Diploma
      '11',   -- Nationally Recognised
      'Y',    -- VET program
      '0803', -- Business & Management
      1200    -- Total nominal hours
    )
  ON CONFLICT (rto_id, code) DO UPDATE SET
    name = EXCLUDED.name,
    level_of_education_id = EXCLUDED.level_of_education_id,
    recognition_id = EXCLUDED.recognition_id,
    vet_flag = EXCLUDED.vet_flag,
    field_of_education_id = EXCLUDED.field_of_education_id,
    nominal_hours = EXCLUDED.nominal_hours;

  -- Get program IDs
  SELECT id INTO v_program_1_id FROM public.programs 
    WHERE rto_id = v_rto_id AND code = 'CPC32220' LIMIT 1;
  SELECT id INTO v_program_2_id FROM public.programs 
    WHERE rto_id = v_rto_id AND code = 'BSB50120' LIMIT 1;

  RAISE NOTICE 'Created programs: CPC32220=%, BSB50120=%', 
    v_program_1_id, v_program_2_id;

  -- ============================================================================
  -- STEP 4: Create Subjects (Units of Competency)
  -- ============================================================================
  
  INSERT INTO public.subjects (
    rto_id,
    code,
    name,
    nominal_hours,
    field_of_education_id,
    vet_flag
  ) VALUES 
    -- Carpentry subjects
    (
      v_rto_id,
      'CPCCWHS2001',
      'Apply WHS requirements, policies and procedures in the construction industry',
      20,
      '0401',
      'Y'
    ),
    (
      v_rto_id,
      'CPCCCA2002',
      'Use carpentry tools and equipment',
      60,
      '0401',
      'Y'
    ),
    (
      v_rto_id,
      'CPCCCA3004',
      'Construct and erect wall frames',
      40,
      '0401',
      'Y'
    ),
    -- Business subjects
    (
      v_rto_id,
      'BSBCRT511',
      'Develop critical thinking in others',
      50,
      '0803',
      'Y'
    ),
    (
      v_rto_id,
      'BSBLDR522',
      'Manage team effectiveness',
      60,
      '0803',
      'Y'
    ),
    (
      v_rto_id,
      'BSBOPS501',
      'Manage business resources',
      40,
      '0803',
      'Y'
    )
  ON CONFLICT (rto_id, code) DO UPDATE SET
    name = EXCLUDED.name,
    nominal_hours = EXCLUDED.nominal_hours,
    field_of_education_id = EXCLUDED.field_of_education_id,
    vet_flag = EXCLUDED.vet_flag;

  -- Get subject IDs
  SELECT id INTO v_subject_1_id FROM public.subjects 
    WHERE rto_id = v_rto_id AND code = 'CPCCWHS2001' LIMIT 1;
  SELECT id INTO v_subject_2_id FROM public.subjects 
    WHERE rto_id = v_rto_id AND code = 'CPCCCA2002' LIMIT 1;
  SELECT id INTO v_subject_3_id FROM public.subjects 
    WHERE rto_id = v_rto_id AND code = 'BSBCRT511' LIMIT 1;
  SELECT id INTO v_subject_4_id FROM public.subjects 
    WHERE rto_id = v_rto_id AND code = 'BSBLDR522' LIMIT 1;

  RAISE NOTICE 'Created subjects: CPCCWHS2001=%, CPCCCA2002=%, BSBCRT511=%, BSBLDR522=%', 
    v_subject_1_id, v_subject_2_id, v_subject_3_id, v_subject_4_id;

  -- ============================================================================
  -- STEP 5: Create Groups (linking Programs and Locations)
  -- ============================================================================
  
  INSERT INTO public.groups (
    rto_id,
    program_id,
    location_id,
    name,
    max_capacity,
    current_enrollment_count
  ) VALUES 
    -- Carpentry groups at different locations
    (
      v_rto_id,
      v_program_1_id,
      v_location_1_id,
      'Carpentry Group A - Geelong',
      20,
      0
    ),
    (
      v_rto_id,
      v_program_1_id,
      v_location_3_id,
      'Carpentry Group B - Werribee Workshop',
      15,
      0
    ),
    -- Business groups
    (
      v_rto_id,
      v_program_2_id,
      v_location_2_id,
      'Business Group A - Melbourne CBD',
      25,
      0
    ),
    (
      v_rto_id,
      v_program_2_id,
      v_location_1_id,
      'Business Group B - Geelong',
      20,
      0
    )
  ON CONFLICT (program_id, location_id, name) DO UPDATE SET
    max_capacity = EXCLUDED.max_capacity,
    current_enrollment_count = EXCLUDED.current_enrollment_count;

  RAISE NOTICE 'Created groups for programs and locations';

  RAISE NOTICE 'Seed data creation complete!';
  RAISE NOTICE 'Summary:';
  RAISE NOTICE '  - 3 Locations created';
  RAISE NOTICE '  - 2 Programs created (CPC32220, BSB50120)';
  RAISE NOTICE '  - 6 Subjects created';
  RAISE NOTICE '  - 4 Groups created';

END $$;

COMMIT;

