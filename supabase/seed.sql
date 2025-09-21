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

  -- 3. Programs (Qualifications) - Australian VET Programs
  INSERT INTO core.programs (id, program_identifier, program_name, status)
  VALUES 
    (v_program_id, 'ICT30120', 'Certificate III in Information, Digital Media and Technology', 'Current'),
    ('a2b3c4d5-e6f7-a8b9-c0d1-e2f3a4b5c6d7', 'ICT40120', 'Certificate IV in Information Technology', 'Current'),
    ('b3c4d5e6-f7a8-b9c0-d1e2-f3a4b5c6d7e8', 'ICT50220', 'Diploma of Information Technology', 'Current'),
    ('c4d5e6f7-a8b9-c0d1-e2f3-a4b5c6d7e8f9', 'BSB30120', 'Certificate III in Business', 'Current'),
    ('d5e6f7a8-b9c0-d1e2-f3a4-b5c6d7e8f9a0', 'BSB40120', 'Certificate IV in Business', 'Current'),
    ('e6f7a8b9-c0d1-e2f3-a4b5-c6d7e8f9a0b1', 'CHC30121', 'Certificate III in Early Childhood Education and Care', 'Current'),
    ('f7a8b9c0-d1e2-f3a4-b5c6-d7e8f9a0b1c2', 'CHC50121', 'Diploma of Early Childhood Education and Care', 'Current'),
    ('a8b9c0d1-e2f3-a4b5-c6d7-e8f9a0b1c2d3', 'SIT30116', 'Certificate III in Tourism', 'Current'),
    ('b9c0d1e2-f3a4-b5c6-d7e8-f9a0b1c2d3e4', 'SIT40116', 'Certificate IV in Travel and Tourism', 'Current'),
    ('c0d1e2f3-a4b5-c6d7-e8f9-a0b1c2d3e4f5', 'CPC30220', 'Certificate III in Carpentry', 'Current')
  ON CONFLICT (id) DO NOTHING;

  -- 4. Subjects (Units of Competency) - Focused VET Units
  INSERT INTO core.subjects (id, subject_identifier, subject_name, status)
  VALUES
    -- ICT30120 Core Units
    (v_subject_core_id, 'BSBWHS311', 'Contribute to workplace health and safety', 'Current'),
    ('f1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c7', 'ICTICT313', 'Use IP technology for business', 'Current'),
    ('f1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c8', 'ICTICT314', 'Identify IP, ethics and privacy policies in ICT environments', 'Current'),
    ('f1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c9', 'ICTSAS305', 'Provide ICT advice to clients', 'Current'),
    ('f1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5d0', 'ICTSAS306', 'Maintain equipment and software', 'Current'),
    
    -- ICT30120 Elective Units
    (v_subject_elective_id, 'ICTWEB301', 'Create a simple markup language document', 'Current'),
    ('f1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5d1', 'ICTWEB302', 'Build simple web pages', 'Current'),
    ('f1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5d2', 'ICTWEB303', 'Produce digital images for the web', 'Current'),
    
    -- ICT40120 Core Units
    ('f1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5d3', 'ICTICT418', 'Contribute to copyright, ethics and privacy in an ICT environment', 'Current'),
    ('f1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5d4', 'ICTICT419', 'Work effectively in the digital media industry', 'Current'),
    ('f1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5d5', 'ICTICT420', 'Develop client user interface', 'Current'),
    ('f1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5d6', 'ICTICT421', 'Connect, maintain and configure hardware components', 'Current'),
    
    -- ICT40120 Elective Units
    ('f1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5d7', 'ICTWEB431', 'Create and style simple markup language documents', 'Current'),
    ('f1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5d8', 'ICTWEB432', 'Design simple web page layouts', 'Current'),
    ('f1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5d9', 'ICTWEB433', 'Confirm accessibility of websites', 'Current'),
    
    -- BSB30120 Core Units
    ('f1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5e0', 'BSBCRT311', 'Apply critical thinking skills in a team environment', 'Current'),
    ('f1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5e1', 'BSBPEF201', 'Support personal wellbeing in the workplace', 'Current'),
    ('f1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5e2', 'BSBSUS211', 'Participate in sustainable work practices', 'Current'),
    ('f1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5e3', 'BSBTWK301', 'Use inclusive work practices', 'Current'),
    
    -- BSB30120 Elective Units
    ('f1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5e4', 'BSBOPS301', 'Maintain business resources', 'Current'),
    ('f1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5e5', 'BSBOPS302', 'Organise personal work priorities and development', 'Current'),
    ('f1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5e6', 'BSBOPS303', 'Organise workplace information', 'Current'),
    
    -- CHC30121 Core Units
    ('f1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5e7', 'CHCECE030', 'Support inclusion and diversity', 'Current'),
    ('f1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5e8', 'CHCECE031', 'Support children''s health, safety and wellbeing', 'Current'),
    ('f1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5e9', 'CHCECE032', 'Nurture babies and toddlers', 'Current'),
    ('f1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5f0', 'CHCECE033', 'Develop positive and respectful relationships with children', 'Current'),
    
    -- CHC30121 Elective Units
    ('f1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5f1', 'CHCECE034', 'Use an approved learning framework to guide practice', 'Current'),
    ('f1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5f2', 'CHCECE035', 'Support the holistic learning and development of children', 'Current'),
    ('f1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5f3', 'CHCECE036', 'Provide experiences to support children''s play and learning', 'Current')
  ON CONFLICT (id) DO NOTHING;

  -- 5. Agents (Educational Agents)
  INSERT INTO core.agents (id, agent_name, agent_type, primary_contact_name, primary_contact_email, primary_contact_phone, status, commission_rate)
  VALUES 
    ('f1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c7', 'Global Education Services', 'ORGANISATION', 'John Smith', 'john@globaledu.com', '+61 2 1234 5678', 'Active', 15.0),
    ('f1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c8', 'Local Education Partners', 'ORGANISATION', 'Sarah Johnson', 'sarah@localedu.com.au', '+61 3 9876 5432', 'Active', 12.5),
    ('f1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c9', 'Student Recruitment Co', 'ORGANISATION', 'Michael Chen', 'michael@studentrecruit.com', '+61 7 5555 1234', 'Active', 18.0)
  ON CONFLICT (id) DO NOTHING;

  -- 5. Program Structure (links subjects to the programs)
  INSERT INTO core.program_subjects (program_id, subject_id, unit_type)
  VALUES
    -- ICT30120 Core Units
    (v_program_id, v_subject_core_id, 'Core'),
    (v_program_id, 'f1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c7', 'Core'),
    (v_program_id, 'f1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c8', 'Core'),
    (v_program_id, 'f1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c9', 'Core'),
    (v_program_id, 'f1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5d0', 'Core'),
    
    -- ICT30120 Elective Units
    (v_program_id, v_subject_elective_id, 'Elective'),
    (v_program_id, 'f1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5d1', 'Elective'),
    (v_program_id, 'f1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5d2', 'Elective'),
    
    -- ICT40120 Core Units
    ('a2b3c4d5-e6f7-a8b9-c0d1-e2f3a4b5c6d7', 'f1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5d3', 'Core'),
    ('a2b3c4d5-e6f7-a8b9-c0d1-e2f3a4b5c6d7', 'f1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5d4', 'Core'),
    ('a2b3c4d5-e6f7-a8b9-c0d1-e2f3a4b5c6d7', 'f1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5d5', 'Core'),
    ('a2b3c4d5-e6f7-a8b9-c0d1-e2f3a4b5c6d7', 'f1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5d6', 'Core'),
    
    -- ICT40120 Elective Units
    ('a2b3c4d5-e6f7-a8b9-c0d1-e2f3a4b5c6d7', 'f1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5d7', 'Elective'),
    ('a2b3c4d5-e6f7-a8b9-c0d1-e2f3a4b5c6d7', 'f1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5d8', 'Elective'),
    ('a2b3c4d5-e6f7-a8b9-c0d1-e2f3a4b5c6d7', 'f1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5d9', 'Elective'),
    
    -- BSB30120 Core Units
    ('c4d5e6f7-a8b9-c0d1-e2f3-a4b5c6d7e8f9', 'f1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5e0', 'Core'),
    ('c4d5e6f7-a8b9-c0d1-e2f3-a4b5c6d7e8f9', 'f1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5e1', 'Core'),
    ('c4d5e6f7-a8b9-c0d1-e2f3-a4b5c6d7e8f9', 'f1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5e2', 'Core'),
    ('c4d5e6f7-a8b9-c0d1-e2f3-a4b5c6d7e8f9', 'f1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5e3', 'Core'),
    
    -- BSB30120 Elective Units
    ('c4d5e6f7-a8b9-c0d1-e2f3-a4b5c6d7e8f9', 'f1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5e4', 'Elective'),
    ('c4d5e6f7-a8b9-c0d1-e2f3-a4b5c6d7e8f9', 'f1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5e5', 'Elective'),
    ('c4d5e6f7-a8b9-c0d1-e2f3-a4b5c6d7e8f9', 'f1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5e6', 'Elective'),
    
    -- CHC30121 Core Units
    ('e6f7a8b9-c0d1-e2f3-a4b5-c6d7e8f9a0b1', 'f1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5e7', 'Core'),
    ('e6f7a8b9-c0d1-e2f3-a4b5-c6d7e8f9a0b1', 'f1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5e8', 'Core'),
    ('e6f7a8b9-c0d1-e2f3-a4b5-c6d7e8f9a0b1', 'f1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5e9', 'Core'),
    ('e6f7a8b9-c0d1-e2f3-a4b5-c6d7e8f9a0b1', 'f1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5f0', 'Core'),
    
    -- CHC30121 Elective Units
    ('e6f7a8b9-c0d1-e2f3-a4b5-c6d7e8f9a0b1', 'f1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5f1', 'Elective'),
    ('e6f7a8b9-c0d1-e2f3-a4b5-c6d7e8f9a0b1', 'f1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5f2', 'Elective'),
    ('e6f7a8b9-c0d1-e2f3-a4b5-c6d7e8f9a0b1', 'f1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5f3', 'Elective')
  ON CONFLICT (program_id, subject_id) DO NOTHING;

  -- === SEED OPERATIONAL ENTITIES ===

  -- 6. Course Offerings (Intakes) for different programs
  INSERT INTO sms_op.course_offerings (program_id, start_date, end_date, status, delivery_location_id)
  VALUES 
    -- ICT30120 Offerings
    (v_program_id, '2026-02-01', '2026-11-30', 'Scheduled', v_location_id),
    (v_program_id, '2026-07-01', '2027-04-30', 'Scheduled', v_location_id),
    
    -- ICT40120 Offerings
    ('a2b3c4d5-e6f7-a8b9-c0d1-e2f3a4b5c6d7', '2026-02-01', '2026-12-31', 'Scheduled', v_location_id),
    ('a2b3c4d5-e6f7-a8b9-c0d1-e2f3a4b5c6d7', '2026-07-01', '2027-05-31', 'Scheduled', v_location_id),
    
    -- BSB30120 Offerings
    ('c4d5e6f7-a8b9-c0d1-e2f3-a4b5c6d7e8f9', '2026-02-01', '2026-11-30', 'Scheduled', v_location_id),
    ('c4d5e6f7-a8b9-c0d1-e2f3-a4b5c6d7e8f9', '2026-07-01', '2027-04-30', 'Scheduled', v_location_id),
    
    -- CHC30121 Offerings
    ('e6f7a8b9-c0d1-e2f3-a4b5-c6d7e8f9a0b1', '2026-02-01', '2026-11-30', 'Scheduled', v_location_id),
    ('e6f7a8b9-c0d1-e2f3-a4b5-c6d7e8f9a0b1', '2026-07-01', '2027-04-30', 'Scheduled', v_location_id);

  -- 7. Payment Plan Templates (Program-scoped)
  -- Ensure each active program has a default "Full upfront" template and at least one instalment plan
  INSERT INTO sms_op.payment_plan_templates (id, program_id, name, is_default, created_at)
  VALUES
    ('11111111-1111-1111-1111-111111111111', v_program_id, 'Full upfront', true, now()),
    ('22222222-2222-2222-2222-222222222222', v_program_id, 'Monthly x6', false, now())
  ON CONFLICT (id) DO NOTHING;

  -- Full upfront: single instalment at day 0 for AUD 10000.00
  INSERT INTO sms_op.payment_plan_template_instalments (id, template_id, description, amount, offset_days, sort_order)
  VALUES
    ('11111111-aaaa-1111-aaaa-111111111111', '11111111-1111-1111-1111-111111111111', 'Tuition (Full Upfront)', 10000.00, 0, 1)
  ON CONFLICT (id) DO NOTHING;

  -- Monthly x6: distribute AUD 10000 over 6 months (remainder on first)
  -- 1st: 1666.70, next 5: 1666.66 each → total 10000.00
  INSERT INTO sms_op.payment_plan_template_instalments (id, template_id, description, amount, offset_days, sort_order)
  VALUES
    ('22222222-aaaa-2222-aaaa-222222222221', '22222222-2222-2222-2222-222222222222', 'Instalment 1', 1666.70, 0, 1),
    ('22222222-aaaa-2222-aaaa-222222222222', '22222222-2222-2222-2222-222222222222', 'Instalment 2', 1666.66, 30, 2),
    ('22222222-aaaa-2222-aaaa-222222222223', '22222222-2222-2222-2222-222222222222', 'Instalment 3', 1666.66, 60, 3),
    ('22222222-aaaa-2222-aaaa-222222222224', '22222222-2222-2222-2222-222222222222', 'Instalment 4', 1666.66, 90, 4),
    ('22222222-aaaa-2222-aaaa-222222222225', '22222222-2222-2222-2222-222222222222', 'Instalment 5', 1666.66, 120, 5),
    ('22222222-aaaa-2222-aaaa-222222222226', '22222222-2222-2222-2222-222222222222', 'Instalment 6', 1666.66, 150, 6)
  ON CONFLICT (id) DO NOTHING;

  -- === SEED CLIENT DATA (for existing tests) ===

  -- 8. Client and related records
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

  -- === SEED TEST APPLICATIONS ===
  
  -- Test Applications with different statuses
  INSERT INTO sms_op.applications (id, status, application_payload, created_client_id, created_enrolment_id, created_by_staff_id, created_at, updated_at)
  VALUES 
    -- Draft Application 1 - John Smith
    ('a1b2c3d4-e5f6-a7b8-c9d0-e1f2a3b4c5d1', 'Draft', 
     '{
       "personalDetails": {
         "firstName": "John",
         "lastName": "Smith",
         "dateOfBirth": "1990-05-15",
         "gender": "M",
         "primaryEmail": "john.smith@example.com",
         "primaryPhone": "+61 2 1234 5678"
       },
       "address": {
         "residential": {
           "street_number": "123",
           "street_name": "Main Street",
           "suburb": "Sydney",
           "state": "NSW",
           "postcode": "2000",
           "flat_unit_details": "Unit 5",
           "building_property_name": "Sydney Towers"
         }
       },
       "avetmissDetails": {
         "countryOfBirthId": "1101",
         "highestSchoolLevelId": "12",
         "languageAtHomeId": "1201",
         "indigenousStatusId": "4",
         "labourForceId": "03",
         "hasDisability": false,
         "hasPriorEducation": true,
         "isAtSchool": false
       },
       "usi": {
         "usi": "USI123456789"
       },
       "enrolmentDetails": {
         "courseOfferingId": "d1e2f3a4-b5c6-d7e8-f9a0-b1c2d3e4f5a6",
         "subjectStructure": {
           "coreSubjectIds": ["b1c2d3e4-f5a6-b7c8-d9e0-f1a2b3c4d5e6"],
           "electiveSubjectIds": ["c1d2e3f4-a5b6-c7d8-e9f0-a1b2c3d4e5f6"]
         }
       },
       "agentId": "f1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c7"
     }'::jsonb, 
     NULL, NULL, NULL, NOW() - INTERVAL '5 days', NOW() - INTERVAL '2 days'),
    
    -- Draft Application 2 - Sarah Johnson
    ('a1b2c3d4-e5f6-a7b8-c9d0-e1f2a3b4c5d2', 'Draft',
     '{
       "personalDetails": {
         "firstName": "Sarah",
         "lastName": "Johnson",
         "dateOfBirth": "1988-12-03",
         "gender": "F",
         "primaryEmail": "sarah.johnson@example.com",
         "primaryPhone": "+61 3 9876 5432"
       },
       "address": {
         "residential": {
           "street_number": "456",
           "street_name": "Collins Street",
           "suburb": "Melbourne",
           "state": "VIC",
           "postcode": "3000",
           "flat_unit_details": null,
           "building_property_name": null
         }
       },
       "avetmissDetails": {
         "countryOfBirthId": "1101",
         "highestSchoolLevelId": "11",
         "languageAtHomeId": "1201",
         "indigenousStatusId": "4",
         "labourForceId": "01",
         "hasDisability": false,
         "hasPriorEducation": false,
         "isAtSchool": false
       },
       "usi": {
         "usi": "USI987654321"
       },
       "enrolmentDetails": {
         "courseOfferingId": "d1e2f3a4-b5c6-d7e8-f9a0-b1c2d3e4f5a6",
         "subjectStructure": {
           "coreSubjectIds": ["b1c2d3e4-f5a6-b7c8-d9e0-f1a2b3c4d5e6"],
           "electiveSubjectIds": ["c1d2e3f4-a5b6-c7d8-e9f0-a1b2c3d4e5f6"]
         }
       },
       "agentId": "f1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c8"
     }'::jsonb,
     NULL, NULL, NULL, NOW() - INTERVAL '3 days', NOW() - INTERVAL '1 day'),
    
    -- Submitted Application 1 - Michael Chen
    ('a1b2c3d4-e5f6-a7b8-c9d0-e1f2a3b4c5d3', 'Submitted',
     '{
       "personalDetails": {
         "firstName": "Michael",
         "lastName": "Chen",
         "dateOfBirth": "1992-08-20",
         "gender": "M",
         "primaryEmail": "michael.chen@example.com",
         "primaryPhone": "+61 7 5555 1234"
       },
       "address": {
         "residential": {
           "street_number": "789",
           "street_name": "Queen Street",
           "suburb": "Brisbane",
           "state": "QLD",
           "postcode": "4000",
           "flat_unit_details": "Apt 12",
           "building_property_name": "Brisbane Central"
         }
       },
       "avetmissDetails": {
         "countryOfBirthId": "1107",
         "highestSchoolLevelId": "12",
         "languageAtHomeId": "1202",
         "indigenousStatusId": "4",
         "labourForceId": "02",
         "hasDisability": false,
         "hasPriorEducation": true,
         "isAtSchool": false
       },
       "usi": {
         "usi": "USI456789123"
       },
       "enrolmentDetails": {
         "courseOfferingId": "d1e2f3a4-b5c6-d7e8-f9a0-b1c2d3e4f5a6",
         "subjectStructure": {
           "coreSubjectIds": ["b1c2d3e4-f5a6-b7c8-d9e0-f1a2b3c4d5e6"],
           "electiveSubjectIds": ["c1d2e3f4-a5b6-c7d8-e9f0-a1b2c3d4e5f6"]
         }
       },
       "agentId": "f1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c9"
     }'::jsonb,
     NULL, NULL, NULL, NOW() - INTERVAL '7 days', NOW() - INTERVAL '1 day'),
    
    -- Submitted Application 2 - Emma Wilson
    ('a1b2c3d4-e5f6-a7b8-c9d0-e1f2a3b4c5d4', 'Submitted',
     '{
       "personalDetails": {
         "firstName": "Emma",
         "lastName": "Wilson",
         "dateOfBirth": "1995-03-10",
         "gender": "F",
         "primaryEmail": "emma.wilson@example.com",
         "primaryPhone": "+61 8 1234 5678"
       },
       "address": {
         "residential": {
           "street_number": "321",
           "street_name": "St Georges Terrace",
           "suburb": "Perth",
           "state": "WA",
           "postcode": "6000",
           "flat_unit_details": null,
           "building_property_name": null
         }
       },
       "avetmissDetails": {
         "countryOfBirthId": "1103",
         "highestSchoolLevelId": "10",
         "languageAtHomeId": "1201",
         "indigenousStatusId": "4",
         "labourForceId": "03",
         "hasDisability": true,
         "hasPriorEducation": false,
         "isAtSchool": false
       },
       "usi": {
         "usi": "USI789123456"
       },
       "enrolmentDetails": {
         "courseOfferingId": "d1e2f3a4-b5c6-d7e8-f9a0-b1c2d3e4f5a6",
         "subjectStructure": {
           "coreSubjectIds": ["b1c2d3e4-f5a6-b7c8-d9e0-f1a2b3c4d5e6"],
           "electiveSubjectIds": ["c1d2e3f4-a5b6-c7d8-e9f0-a1b2c3d4e5f6"]
         }
       },
       "agentId": "f1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c7"
     }'::jsonb,
     NULL, NULL, NULL, NOW() - INTERVAL '10 days', NOW() - INTERVAL '2 days'),
    
    -- Approved Application (already processed)
    ('a1b2c3d4-e5f6-a7b8-c9d0-e1f2a3b4c5d5', 'Approved',
     '{
       "personalDetails": {
         "firstName": "David",
         "lastName": "Brown",
         "dateOfBirth": "1987-11-25",
         "gender": "M",
         "primaryEmail": "david.brown@example.com",
         "primaryPhone": "+61 2 9876 5432"
       },
       "address": {
         "residential": {
           "street_number": "654",
           "street_name": "Pitt Street",
           "suburb": "Sydney",
           "state": "NSW",
           "postcode": "2000",
           "flat_unit_details": "Level 15",
           "building_property_name": "Sydney Plaza"
         }
       },
       "avetmissDetails": {
         "countryOfBirthId": "1101",
         "highestSchoolLevelId": "12",
         "languageAtHomeId": "1201",
         "indigenousStatusId": "4",
         "labourForceId": "01",
         "hasDisability": false,
         "hasPriorEducation": true,
         "isAtSchool": false
       },
       "usi": {
         "usi": "USI321654987"
       },
       "enrolmentDetails": {
         "courseOfferingId": "d1e2f3a4-b5c6-d7e8-f9a0-b1c2d3e4f5a6",
         "subjectStructure": {
           "coreSubjectIds": ["b1c2d3e4-f5a6-b7c8-d9e0-f1a2b3c4d5e6"],
           "electiveSubjectIds": ["c1d2e3f4-a5b6-c7d8-e9f0-a1b2c3d4e5f6"]
         }
       },
       "agentId": "f1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c8"
     }'::jsonb,
     v_client_id, NULL, NULL, NOW() - INTERVAL '15 days', NOW() - INTERVAL '5 days'),

    -- Perfect Test Application - Karan Rajput (Complete Data)
    ('a1b2c3d4-e5f6-a7b8-c9d0-e1f2a3b4c5d6', 'Submitted',
     '{
       "personalDetails": {
         "firstName": "Karan",
         "lastName": "Rajput",
         "dateOfBirth": "1993-06-15",
         "gender": "M",
         "primaryEmail": "shshwtsuthar@gmail.com",
         "primaryPhone": "+61 4 1234 5678",
         "passportNumber": "P1234567",
         "nationality": "Indian"
       },
       "address": {
         "residential": {
           "street_number": "42",
           "street_name": "Collins Street",
           "suburb": "Melbourne",
           "state": "VIC",
           "postcode": "3000",
           "flat_unit_details": "Apt 15B",
           "building_property_name": "Melbourne Central Tower"
         }
       },
       "avetmissDetails": {
         "countryOfBirthId": "1106",
         "highestSchoolLevelId": "12",
         "languageAtHomeId": "1201",
         "indigenousStatusId": "4",
         "labourForceId": "01",
         "hasDisability": false,
         "hasPriorEducation": true,
         "isAtSchool": false
       },
       "usi": {
         "usi": "USI987654321"
       },
       "enrolmentDetails": {
         "courseOfferingId": "d1e2f3a4-b5c6-d7e8-f9a0-b1c2d3e4f5a6",
         "programName": "Certificate III in Information, Digital Media and Technology",
         "courseName": "Certificate III in Information, Digital Media and Technology",
         "courseCode": "ICT30120",
         "courseCricosCode": "12345A",
         "startDate": "2026-02-01",
         "endDate": "2026-11-30",
         "expectedCompletionDate": "2026-11-30",
         "locationName": "Melbourne Campus",
         "subjectStructure": {
           "coreSubjectIds": ["b1c2d3e4-f5a6-b7c8-d9e0-f1a2b3c4d5e6", "f1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c7"],
           "electiveSubjectIds": ["c1d2e3f4-a5b6-c7d8-e9f0-a1b2c3d4e5f6", "f1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5d1"]
         }
       },
       "paymentPlan": {
         "tuitionFeeSnapshot": 12000,
         "schedule": [
           {
             "dueDate": "2026-02-01",
             "description": "Enrollment Fee",
             "amount": 2000
           },
           {
             "dueDate": "2026-03-01",
             "description": "First Instalment",
             "amount": 2500
           },
           {
             "dueDate": "2026-05-01",
             "description": "Second Instalment",
             "amount": 2500
           },
           {
             "dueDate": "2026-07-01",
             "description": "Third Instalment",
             "amount": 2500
           },
           {
             "dueDate": "2026-09-01",
             "description": "Fourth Instalment",
             "amount": 2500
           }
         ]
       },
       "agentId": "f1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c7",
       "agentName": "Global Education Services"
     }'::jsonb,
     NULL, NULL, NULL, NOW() - INTERVAL '3 days', NOW() - INTERVAL '1 day')
  ON CONFLICT (id) DO NOTHING;

  -- === SEED REFERENCE DATA ===
  
  -- Countries
  INSERT INTO avetmiss.codes (code_type, code_value, code_description, is_active, sort_order)
  VALUES 
    ('COUNTRY', '1101', 'Australia', true, 1),
    ('COUNTRY', '1102', 'New Zealand', true, 2),
    ('COUNTRY', '1103', 'United Kingdom', true, 3),
    ('COUNTRY', '1104', 'United States of America', true, 4),
    ('COUNTRY', '1105', 'Canada', true, 5),
    ('COUNTRY', '1106', 'India', true, 6),
    ('COUNTRY', '1107', 'China', true, 7),
    ('COUNTRY', '1108', 'Japan', true, 8),
    ('COUNTRY', '1109', 'South Korea', true, 9),
    ('COUNTRY', '1110', 'Thailand', true, 10)
  ON CONFLICT (code_type, code_value) DO NOTHING;

  -- Languages
  INSERT INTO avetmiss.codes (code_type, code_value, code_description, is_active, sort_order)
  VALUES 
    ('LANGUAGE', '1201', 'English', true, 1),
    ('LANGUAGE', '1202', 'Mandarin', true, 2),
    ('LANGUAGE', '1203', 'Arabic', true, 3),
    ('LANGUAGE', '1204', 'Cantonese', true, 4),
    ('LANGUAGE', '1205', 'Vietnamese', true, 5),
    ('LANGUAGE', '1206', 'Italian', true, 6),
    ('LANGUAGE', '1207', 'Greek', true, 7),
    ('LANGUAGE', '1208', 'Croatian', true, 8),
    ('LANGUAGE', '1209', 'Polish', true, 9),
    ('LANGUAGE', '1210', 'Macedonian', true, 10)
  ON CONFLICT (code_type, code_value) DO NOTHING;

  -- Disability Types
  INSERT INTO avetmiss.codes (code_type, code_value, code_description, is_active, sort_order)
  VALUES 
    ('DisabilityType', '1', 'Hearing/deaf', true, 1),
    ('DisabilityType', '2', 'Physical', true, 2),
    ('DisabilityType', '3', 'Intellectual', true, 3),
    ('DisabilityType', '4', 'Learning', true, 4),
    ('DisabilityType', '5', 'Mental illness', true, 5),
    ('DisabilityType', '6', 'Acquired brain impairment', true, 6),
    ('DisabilityType', '7', 'Vision', true, 7),
    ('DisabilityType', '8', 'Medical condition', true, 8),
    ('DisabilityType', '9', 'Other', true, 9)
  ON CONFLICT (code_type, code_value) DO NOTHING;

  -- Prior Educational Achievement
  INSERT INTO avetmiss.codes (code_type, code_value, code_description, is_active, sort_order)
  VALUES 
    ('PriorEducationalAchievement', '01', 'Year 12 or equivalent', true, 1),
    ('PriorEducationalAchievement', '02', 'Year 11 or equivalent', true, 2),
    ('PriorEducationalAchievement', '03', 'Year 10 or equivalent', true, 3),
    ('PriorEducationalAchievement', '04', 'Year 9 or equivalent', true, 4),
    ('PriorEducationalAchievement', '05', 'Year 8 or below', true, 5),
    ('PriorEducationalAchievement', '06', 'Certificate I', true, 6),
    ('PriorEducationalAchievement', '07', 'Certificate II', true, 7),
    ('PriorEducationalAchievement', '08', 'Certificate III', true, 8),
    ('PriorEducationalAchievement', '09', 'Certificate IV', true, 9),
    ('PriorEducationalAchievement', '10', 'Diploma', true, 10),
    ('PriorEducationalAchievement', '11', 'Advanced Diploma', true, 11),
    ('PriorEducationalAchievement', '12', 'Bachelor Degree', true, 12),
    ('PriorEducationalAchievement', '13', 'Graduate Certificate', true, 13),
    ('PriorEducationalAchievement', '14', 'Graduate Diploma', true, 14),
    ('PriorEducationalAchievement', '15', 'Masters Degree', true, 15),
    ('PriorEducationalAchievement', '16', 'Doctoral Degree', true, 16)
  ON CONFLICT (code_type, code_value) DO NOTHING;

  -- Funding Source National
  INSERT INTO avetmiss.codes (code_type, code_value, code_description, is_active, sort_order)
  VALUES 
    ('FundingSourceNational', '01', 'Commonwealth and state funding', true, 1),
    ('FundingSourceNational', '02', 'State funding only', true, 2),
    ('FundingSourceNational', '03', 'Fee for service', true, 3),
    ('FundingSourceNational', '04', 'Commonwealth funding only', true, 4),
    ('FundingSourceNational', '05', 'No funding', true, 5)
  ON CONFLICT (code_type, code_value) DO NOTHING;

  -- Study Reason
  INSERT INTO avetmiss.codes (code_type, code_value, code_description, is_active, sort_order)
  VALUES 
    ('StudyReason', '01', 'To get a job', true, 1),
    ('StudyReason', '02', 'To develop or start my own business', true, 2),
    ('StudyReason', '03', 'To try for a different career', true, 3),
    ('StudyReason', '04', 'To increase my job opportunities', true, 4),
    ('StudyReason', '05', 'To improve my general educational skills', true, 5),
    ('StudyReason', '06', 'To get skills for community/voluntary work', true, 6),
    ('StudyReason', '07', 'To increase my personal confidence', true, 7),
    ('StudyReason', '08', 'Other reasons', true, 8)
  ON CONFLICT (code_type, code_value) DO NOTHING;

END $$;