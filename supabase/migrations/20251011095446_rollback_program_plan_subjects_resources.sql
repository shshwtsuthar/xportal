-- Rollback: Remove incorrectly placed resource fields from program_plan_subjects
-- These fields belong in the new program_plan_classes table instead

BEGIN;

-- Remove resource fields from program_plan_subjects
ALTER TABLE public.program_plan_subjects
  DROP COLUMN IF EXISTS trainer_id,
  DROP COLUMN IF EXISTS location_id,
  DROP COLUMN IF EXISTS classroom_id,
  DROP COLUMN IF EXISTS class_type;

COMMIT;
