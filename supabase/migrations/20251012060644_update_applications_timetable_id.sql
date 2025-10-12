BEGIN;

-- Add timetable_id column to applications table
ALTER TABLE public.applications 
ADD COLUMN timetable_id UUID REFERENCES public.timetables(id) ON DELETE SET NULL;

-- Add comment
COMMENT ON COLUMN public.applications.timetable_id IS 'Links application to a specific timetable for enrollment progression.';

-- Drop the old program_plan_id column
ALTER TABLE public.applications DROP COLUMN IF EXISTS program_plan_id;

COMMIT;
