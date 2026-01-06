-- Remove timetable-group consistency validation trigger (if exists)
-- This trigger is no longer needed because:
-- 1. Program plans are now generalized (no group_id)
-- 2. Group assignment moved to individual classes
-- 3. Timetables can contain classes for multiple groups

BEGIN;

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS validate_timetable_group_consistency_trigger ON public.timetable_program_plans;

-- Drop function if it exists
DROP FUNCTION IF EXISTS public.validate_timetable_group_consistency();

COMMENT ON TABLE public.timetables IS 'Timetables are now generalized containers of program plans that can span multiple groups and locations';

COMMIT;

