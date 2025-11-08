-- Remove CRICOS course and financial fields from applications and student_cricos tables
-- These fields are no longer needed as they have been removed from the UI

-- 1. Drop columns from applications table
ALTER TABLE public.applications
  DROP COLUMN IF EXISTS cricos_course_code,
  DROP COLUMN IF EXISTS course_location,
  DROP COLUMN IF EXISTS proposed_course_end_date,
  DROP COLUMN IF EXISTS study_load,
  DROP COLUMN IF EXISTS initial_prepaid_tuition_fee,
  DROP COLUMN IF EXISTS prepaid_fee_from_date,
  DROP COLUMN IF EXISTS prepaid_fee_to_date,
  DROP COLUMN IF EXISTS total_tuition_fees,
  DROP COLUMN IF EXISTS non_tuition_fees_received;

-- 2. Drop columns from student_cricos table
ALTER TABLE public.student_cricos
  DROP COLUMN IF EXISTS cricos_course_code,
  DROP COLUMN IF EXISTS course_location,
  DROP COLUMN IF EXISTS proposed_course_end_date,
  DROP COLUMN IF EXISTS study_load,
  DROP COLUMN IF EXISTS initial_prepaid_tuition_fee,
  DROP COLUMN IF EXISTS prepaid_fee_from_date,
  DROP COLUMN IF EXISTS prepaid_fee_to_date,
  DROP COLUMN IF EXISTS total_tuition_fees,
  DROP COLUMN IF EXISTS non_tuition_fees_received;

