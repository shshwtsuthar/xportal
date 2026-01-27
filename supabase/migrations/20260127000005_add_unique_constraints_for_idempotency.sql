-- Add unique constraints required for ON CONFLICT clauses in approve_application_atomic
-- These constraints ensure idempotency when the approval process is retried

-- 1. student_addresses: unique constraint on (student_id, type)
-- Note: The existing constraint has a WHERE clause, but we need it without for ON CONFLICT
CREATE UNIQUE INDEX IF NOT EXISTS student_addresses_student_type_unique 
  ON public.student_addresses(student_id, type);

-- 2. student_avetmiss: unique constraint on student_id (one AVETMISS record per student)
CREATE UNIQUE INDEX IF NOT EXISTS student_avetmiss_student_id_unique 
  ON public.student_avetmiss(student_id);

-- 3. student_disabilities: unique constraint on (student_id, disability_type_id)
CREATE UNIQUE INDEX IF NOT EXISTS student_disabilities_student_disability_unique 
  ON public.student_disabilities(student_id, disability_type_id);

-- 4. student_prior_education: unique constraint on (student_id, prior_achievement_id)
CREATE UNIQUE INDEX IF NOT EXISTS student_prior_education_student_achievement_unique 
  ON public.student_prior_education(student_id, prior_achievement_id);

-- 5. student_cricos: unique constraint on student_id (one CRICOS record per student)
CREATE UNIQUE INDEX IF NOT EXISTS student_cricos_student_id_unique 
  ON public.student_cricos(student_id);

-- 6. student_contacts_emergency: unique constraint on (student_id, name)
CREATE UNIQUE INDEX IF NOT EXISTS student_contacts_emergency_student_name_unique 
  ON public.student_contacts_emergency(student_id, name);

-- 7. student_contacts_guardians: unique constraint on (student_id, name)
CREATE UNIQUE INDEX IF NOT EXISTS student_contacts_guardians_student_name_unique 
  ON public.student_contacts_guardians(student_id, name);

-- 8. enrollment_classes: unique constraint on (enrollment_id, program_plan_class_id, class_date, start_time)
CREATE UNIQUE INDEX IF NOT EXISTS enrollment_classes_enrollment_class_schedule_unique 
  ON public.enrollment_classes(enrollment_id, program_plan_class_id, class_date, start_time);

-- Add comments for documentation
COMMENT ON INDEX student_addresses_student_type_unique IS 
  'Ensures one address of each type per student (required for approve_application_atomic idempotency)';

COMMENT ON INDEX student_avetmiss_student_id_unique IS 
  'Ensures one AVETMISS record per student (required for approve_application_atomic idempotency)';

COMMENT ON INDEX student_disabilities_student_disability_unique IS 
  'Prevents duplicate disability records for same student (required for approve_application_atomic idempotency)';

COMMENT ON INDEX student_prior_education_student_achievement_unique IS 
  'Prevents duplicate prior education records (required for approve_application_atomic idempotency)';

COMMENT ON INDEX student_cricos_student_id_unique IS 
  'Ensures one CRICOS record per student (required for approve_application_atomic idempotency)';

COMMENT ON INDEX student_contacts_emergency_student_name_unique IS 
  'Prevents duplicate emergency contacts with same name (required for approve_application_atomic idempotency)';

COMMENT ON INDEX student_contacts_guardians_student_name_unique IS 
  'Prevents duplicate guardian contacts with same name (required for approve_application_atomic idempotency)';

COMMENT ON INDEX enrollment_classes_enrollment_class_schedule_unique IS 
  'Prevents duplicate class enrollments at same time (required for approve_application_atomic idempotency)';
