-- =============================================================================
-- FILE:        seed.sql (v5 - Dependency Corrected)
-- PROJECT:     XPortal Student Management System (SMS)
-- AUTHOR:      Lead Backend Engineer
--
-- DESCRIPTION:
-- This script seeds the local database with a complete set of data required
-- for end-to-end testing. It now correctly handles the strict relational
-- integrity of the schema by creating entities in the correct dependency order.
-- It guarantees the existence of an Organisation before creating a Location,
-- resolving the previous foreign key violation.
-- =============================================================================

-- Seed the essential security roles
INSERT INTO security.roles (name)
VALUES
  ('Admin'), ('Trainer'), ('Agent'), ('Compliance'), ('Finance'), ('Academic Manager')
ON CONFLICT (name) DO NOTHING;

DO $$
DECLARE
  -- Declare static UUIDs for all entities for predictable testing.
  v_org_id UUID := 'f1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6';
  v_client_id UUID := '2d1fb0d9-3575-442d-8a5e-5025658281e5';
  v_client_address_id UUID := '8a7b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d';
  v_program_id UUID := 'a1b2c3d4-e5f6-a7b8-c9d0-e1f2a3b4c5d6';
  v_subject_core_id UUID := 'b1c2d3e4-f5a6-b7c8-d9e0-f1a2b3c4d5e6';
  v_subject_elective_id UUID := 'c1d2e3f4-a5b6-c7d8-e9f0-a1b2c3d4e5f6';
  v_offering_id UUID := 'd1e2f3a4-b5c6-d7e8-f9a0-b1c2d3e4f5a6';
  v_location_id UUID := 'e1f2a3b4-c5d6-e7f8-a9b0-c1d2e3f4a5b6';
  v_location_address_id UUID := '1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d';
BEGIN
  -- === SEED CORE ENTITIES (IN STRICT DEPENDENCY ORDER) ===

  -- 1. Organisation (MUST exist before Location)
  INSERT INTO core.organisations (id, organisation_identifier, organisation_name, state_identifier)
  VALUES (v_org_id, '99999', 'XPortal Test RTO', 'VIC')
  ON CONFLICT (id) DO NOTHING;

  -- 2. Location Address and Location (depends on Organisation)
  INSERT INTO core.addresses (id, street_name, suburb, state_identifier, postcode)
  VALUES (v_location_address_id, 'Main Street', 'Melbourne', 'VIC', '3000')
  ON CONFLICT (id) DO NOTHING;
  
  INSERT INTO core.locations (id, organisation_id, location_identifier, location_name, address_id)
  VALUES (v_location_id, v_org_id, 'MELB-CAMPUS-01', 'Melbourne Campus', v_location_address_id)
  ON CONFLICT (id) DO NOTHING;

  -- 3. Program (Qualification)
  INSERT INTO core.programs (id, program_identifier, program_name, status)
  VALUES (v_program_id, 'BDE101', 'Certificate III in Backend Engineering', 'Current')
  ON CONFLICT (id) DO NOTHING;

  -- 4. Subjects (Units of Competency)
  INSERT INTO core.subjects (id, subject_identifier, subject_name, status)
  VALUES
    (v_subject_core_id, 'SQL-101', 'SQL Fundamentals', 'Current'),
    (v_subject_elective_id, 'API-201', 'RESTful API Design', 'Current')
  ON CONFLICT (id) DO NOTHING;

  -- 5. Program Structure (links subjects to the program)
  INSERT INTO core.program_subjects (program_id, subject_id, unit_type)
  VALUES
    (v_program_id, v_subject_core_id, 'Core'),
    (v_program_id, v_subject_elective_id, 'Elective')
  ON CONFLICT (program_id, subject_id) DO NOTHING;

  -- === SEED OPERATIONAL ENTITIES ===

  -- 6. Course Offering (Intake) (depends on Program and Location)
  INSERT INTO sms_op.course_offerings (id, program_id, start_date, end_date, status, delivery_location_id)
  VALUES (v_offering_id, v_program_id, '2026-02-01', '2026-11-30', 'Scheduled', v_location_id)
  ON CONFLICT (id) DO NOTHING;

  -- === SEED CLIENT DATA (for existing tests) ===

  -- 7. Client and related records
  INSERT INTO core.addresses (id, street_name, suburb, state_identifier, postcode)
  VALUES (v_client_address_id, 'Example St', 'Sydney', 'NSW', '2000')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO core.clients (id, client_identifier, first_name, last_name, date_of_birth, gender, primary_email, country_of_birth_identifier)
  VALUES (v_client_id, 'XPT-TEST-001', 'Jane', 'Doe', '1995-08-20', 'F', 'jane.doe@test.xportal.com', '1101')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO core.client_addresses (client_id, address_id, address_type)
  VALUES (v_client_id, v_client_address_id, 'HOME')
  ON CONFLICT (client_id, address_id) DO NOTHING;

  INSERT INTO avetmiss.client_avetmiss_details (client_id, highest_school_level_completed_identifier, language_identifier, indigenous_status_identifier, labour_force_status_identifier, at_school_flag, disability_flag, prior_educational_achievement_flag)
  VALUES (v_client_id, '12', '1201', '4', '03', 'N', 'N', 'N')
  ON CONFLICT (client_id) DO NOTHING;

END $$;