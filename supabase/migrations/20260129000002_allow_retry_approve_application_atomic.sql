-- 20260129000002_allow_retry_approve_application_atomic.sql
-- Purpose: Make approve_application_atomic retry-safe when application is already APPROVED.
-- Allows re-running the Edge Function to re-attempt Phase 2 operations (files/auth/email)
-- without blocking on status guards.

CREATE OR REPLACE FUNCTION approve_application_atomic(
  p_application_id UUID,
  p_new_group_id UUID DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
  v_app applications%ROWTYPE;
  v_student students%ROWTYPE;
  v_enrollment enrollments%ROWTYPE;
  v_template payment_plan_templates%ROWTYPE;
  v_existing_student students%ROWTYPE;
  v_existing_enrollment enrollments%ROWTYPE;
  v_migration_result jsonb;
  v_result jsonb;
BEGIN
  -- Lock the application row to prevent concurrent approvals
  SELECT * INTO v_app
  FROM applications
  WHERE id = p_application_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  -- Validate application status
  IF v_app.status = 'ARCHIVED' THEN
    RAISE EXCEPTION 'Archived applications cannot be approved or edited';
  END IF;

  -- Retry-safety: allow re-running approval when already APPROVED so that the Edge Function
  -- can re-attempt post-transaction (Phase 2) actions.
  IF v_app.status NOT IN ('ACCEPTED', 'APPROVED') THEN
    RAISE EXCEPTION 'Application must be ACCEPTED to approve. Current: %', v_app.status;
  END IF;

  -- Validate required fields (only required to do an approval / create enrollment, etc.)
  IF v_app.payment_plan_template_id IS NULL THEN
    RAISE EXCEPTION 'payment_plan_template_id is required';
  END IF;

  IF v_app.payment_anchor_date IS NULL THEN
    RAISE EXCEPTION 'payment_anchor_date is required';
  END IF;

  IF v_app.program_id IS NULL THEN
    RAISE EXCEPTION 'program_id is required';
  END IF;

  -- Update group_id if provided (handles race condition)
  IF p_new_group_id IS NOT NULL THEN
    UPDATE applications
    SET group_id = p_new_group_id
    WHERE id = p_application_id;
    
    v_app.group_id := p_new_group_id;
  END IF;

  -- Fetch and validate payment plan template
  SELECT * INTO v_template
  FROM payment_plan_templates
  WHERE id = v_app.payment_plan_template_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment plan template not found';
  END IF;

  -- 1) Create or fetch student (idempotent)
  SELECT * INTO v_existing_student
  FROM students
  WHERE application_id = v_app.id;

  IF FOUND THEN
    v_student := v_existing_student;
    RAISE NOTICE 'Student already exists for application %, using existing student %', v_app.id, v_student.id;
  ELSE
    -- Create new student
    INSERT INTO students (
      rto_id, application_id, salutation, first_name, middle_name, last_name,
      preferred_name, email, date_of_birth, work_phone, mobile_phone,
      alternative_email, status, student_id_display
    ) VALUES (
      v_app.rto_id, v_app.id, v_app.salutation, v_app.first_name, v_app.middle_name, 
      v_app.last_name, v_app.preferred_name, v_app.email, v_app.date_of_birth, 
      v_app.work_phone, v_app.mobile_phone, v_app.alternative_email, 'ACTIVE',
      COALESCE(v_app.student_id_display, '')
    )
    RETURNING * INTO v_student;
  END IF;

  -- 2) Create or fetch enrollment (idempotent)
  SELECT * INTO v_existing_enrollment
  FROM enrollments
  WHERE student_id = v_student.id AND program_id = v_app.program_id;

  IF FOUND THEN
    v_enrollment := v_existing_enrollment;
    RAISE NOTICE 'Enrollment already exists for student % and program %, using existing enrollment %', 
      v_student.id, v_app.program_id, v_enrollment.id;
  ELSE
    -- Create new enrollment
    INSERT INTO enrollments (
      student_id, program_id, rto_id, status, commencement_date, payment_plan_template_id
    ) VALUES (
      v_student.id, v_app.program_id, v_app.rto_id, 'ACTIVE', 
      v_app.payment_anchor_date, v_app.payment_plan_template_id
    )
    RETURNING * INTO v_enrollment;
  END IF;

  -- 3) Migrate invoices (idempotent - function checks for existing invoices)
  SELECT jsonb_agg(row_to_json(r.*)) INTO v_migration_result
  FROM migrate_application_invoices_to_enrollment(
    p_application_id := v_app.id,
    p_enrollment_id := v_enrollment.id
  ) r;

  RAISE NOTICE 'Migration result: %', v_migration_result;

  -- 4) Copy student addresses (idempotent via ON CONFLICT)
  INSERT INTO student_addresses (
    student_id, rto_id, type, building_name, unit_details, number, street, po_box,
    suburb, state, postcode, country, is_primary
  ) VALUES (
    v_student.id, v_app.rto_id, 'street', v_app.street_building_name, 
    v_app.street_unit_details, v_app.street_number, v_app.street_name, v_app.street_po_box,
    v_app.suburb, v_app.state, v_app.postcode, v_app.street_country, true
  )
  ON CONFLICT (student_id, type) DO NOTHING;

  -- Add postal address if different
  IF NOT COALESCE(v_app.postal_is_same_as_street, false) THEN
    INSERT INTO student_addresses (
      student_id, rto_id, type, building_name, unit_details, number, street, po_box,
      suburb, state, postcode, country, is_primary
    ) VALUES (
      v_student.id, v_app.rto_id, 'postal', v_app.postal_building_name,
      v_app.postal_unit_details, v_app.postal_street_number, v_app.postal_street_name, v_app.postal_po_box,
      v_app.postal_suburb, v_app.postal_state, v_app.postal_postcode, 
      v_app.postal_country, false
    )
    ON CONFLICT (student_id, type) DO NOTHING;
  END IF;

  -- 5) Copy AVETMISS data (idempotent via ON CONFLICT)
  INSERT INTO student_avetmiss (
    student_id, rto_id, gender, highest_school_level_id, year_highest_school_level_completed,
    indigenous_status_id, labour_force_status_id, country_of_birth_id, language_code,
    citizenship_status_code, at_school_flag, disability_flag, prior_education_flag,
    survey_contact_status, vsn, usi
  ) VALUES (
    v_student.id, v_app.rto_id, v_app.gender, v_app.highest_school_level_id,
    v_app.year_highest_school_level_completed, v_app.indigenous_status_id,
    v_app.labour_force_status_id, v_app.country_of_birth_id, v_app.language_code,
    v_app.citizenship_status_code, v_app.at_school_flag, v_app.disability_flag,
    v_app.prior_education_flag, COALESCE(v_app.survey_contact_status, 'A'),
    v_app.vsn, v_app.usi
  )
  ON CONFLICT (student_id) DO NOTHING;

  -- 6) Copy disabilities (idempotent via ON CONFLICT)
  INSERT INTO student_disabilities (student_id, rto_id, disability_type_id)
  SELECT v_student.id, v_app.rto_id, disability_type_id
  FROM application_disabilities
  WHERE application_id = v_app.id
  ON CONFLICT (student_id, disability_type_id) DO NOTHING;

  -- 7) Copy prior education (idempotent via ON CONFLICT)
  INSERT INTO student_prior_education (student_id, rto_id, prior_achievement_id, recognition_type)
  SELECT v_student.id, v_app.rto_id, prior_achievement_id, recognition_type
  FROM application_prior_education
  WHERE application_id = v_app.id
  ON CONFLICT (student_id, prior_achievement_id) DO NOTHING;

  -- 8) Copy CRICOS data (idempotent via ON CONFLICT)
  INSERT INTO student_cricos (
    student_id, rto_id, is_international, passport_number, passport_issue_date,
    passport_expiry_date, place_of_birth, visa_type, visa_number, visa_expiry_date,
    visa_grant_date, visa_application_office, holds_visa, country_of_citizenship,
    coe_number, is_under_18, provider_accepting_welfare_responsibility, welfare_start_date,
    provider_arranged_oshc, oshc_provider_name, oshc_policy_number, oshc_start_date,
    oshc_end_date, has_english_test, english_test_type, english_test_date, ielts_score,
    has_previous_study_australia, previous_provider_name, completed_previous_course,
    has_release_letter, privacy_notice_accepted, written_agreement_accepted, written_agreement_date
  ) VALUES (
    v_student.id, v_app.rto_id, COALESCE(v_app.is_international, false), v_app.passport_number,
    v_app.passport_issue_date, v_app.passport_expiry_date, v_app.place_of_birth,
    v_app.visa_type, v_app.visa_number, v_app.visa_expiry_date, v_app.visa_grant_date,
    v_app.visa_application_office, v_app.holds_visa, v_app.country_of_citizenship,
    v_app.coe_number, v_app.is_under_18, v_app.provider_accepting_welfare_responsibility,
    v_app.welfare_start_date, v_app.provider_arranged_oshc, v_app.oshc_provider_name,
    v_app.oshc_policy_number, v_app.oshc_start_date, v_app.oshc_end_date,
    v_app.has_english_test, v_app.english_test_type, v_app.english_test_date,
    v_app.ielts_score, v_app.has_previous_study_australia, v_app.previous_provider_name,
    v_app.completed_previous_course, v_app.has_release_letter, v_app.privacy_notice_accepted,
    v_app.written_agreement_accepted, v_app.written_agreement_date
  )
  ON CONFLICT (student_id) DO NOTHING;

  -- 9) Copy emergency contacts (idempotent via ON CONFLICT)
  IF v_app.ec_name IS NOT NULL THEN
    INSERT INTO student_contacts_emergency (student_id, rto_id, name, relationship, phone_number)
    VALUES (v_student.id, v_app.rto_id, v_app.ec_name, v_app.ec_relationship, v_app.ec_phone_number)
    ON CONFLICT (student_id, name) DO NOTHING;
  END IF;

  -- 10) Copy guardian contacts (idempotent via ON CONFLICT)
  IF v_app.g_name IS NOT NULL THEN
    INSERT INTO student_contacts_guardians (student_id, rto_id, name, email, phone_number, relationship)
    VALUES (v_student.id, v_app.rto_id, v_app.g_name, v_app.g_email, v_app.g_phone_number, v_app.g_relationship)
    ON CONFLICT (student_id, name) DO NOTHING;
  END IF;

  -- 11) Copy learning plan subjects to enrollment_subjects (idempotent via ON CONFLICT)
  INSERT INTO enrollment_subjects (
    enrollment_id, program_plan_subject_id, outcome_code, start_date, end_date,
    is_catch_up, delivery_location_id, delivery_mode_id, scheduled_hours
  )
  SELECT 
    v_enrollment.id, program_plan_subject_id, NULL, planned_start_date, planned_end_date,
    is_catch_up, NULL, NULL, NULL
  FROM application_learning_subjects
  WHERE application_id = v_app.id
  ORDER BY sequence_order
  ON CONFLICT (enrollment_id, program_plan_subject_id) DO NOTHING;

  -- 12) Copy learning plan classes to enrollment_classes (filter by preferred location)
  -- Only if preferred_location_id is set
  IF v_app.preferred_location_id IS NOT NULL THEN
    INSERT INTO enrollment_classes (
      enrollment_id, program_plan_class_id, class_date, start_time, end_time,
      trainer_id, location_id, classroom_id, class_type, notes
    )
    SELECT 
      v_enrollment.id, program_plan_class_id, class_date, start_time, end_time,
      trainer_id, location_id, classroom_id, class_type, NULL
    FROM application_learning_classes
    WHERE application_id = v_app.id 
      AND location_id = v_app.preferred_location_id
    ON CONFLICT (enrollment_id, program_plan_class_id, class_date, start_time) DO NOTHING;
  END IF;

  -- 13) Link offer letters to student (idempotent - only updates NULL student_ids)
  UPDATE offer_letters
  SET student_id = v_student.id
  WHERE application_id = v_app.id AND student_id IS NULL;

  -- 14) Update application status to APPROVED (atomic check)
  -- Retry-safety: if already APPROVED, don't fail, just return the same student/enrollment IDs.
  IF v_app.status = 'ACCEPTED' THEN
    UPDATE applications
    SET status = 'APPROVED', updated_at = now()
    WHERE id = v_app.id AND status = 'ACCEPTED';

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Application status changed during approval process';
    END IF;
  END IF;

  -- Build result
  v_result := jsonb_build_object(
    'student_id', v_student.id,
    'enrollment_id', v_enrollment.id,
    'student_email', v_student.email,
    'student_first_name', v_student.first_name,
    'student_last_name', v_student.last_name,
    'student_preferred_name', v_student.preferred_name,
    'student_id_display', v_student.student_id_display,
    'rto_id', v_app.rto_id,
    'was_new_student', (v_existing_student.id IS NULL),
    'was_new_enrollment', (v_existing_enrollment.id IS NULL)
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

