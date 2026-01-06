-- Remove group_id from program_plans table as it's now moved to classes
BEGIN;

-- Step 1: Drop the index on group_id
DROP INDEX IF EXISTS idx_program_plans_group;

-- Step 2: Remove the group_id column from program_plans
-- This is safe because we've already migrated the data to program_plan_classes
ALTER TABLE public.program_plans
DROP COLUMN IF EXISTS group_id;

COMMENT ON TABLE public.program_plans IS 'Program plans are now generalized - group assignment happens at the class level';

COMMIT;

