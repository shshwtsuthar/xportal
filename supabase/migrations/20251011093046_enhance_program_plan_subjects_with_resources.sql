-- Enhance program_plan_subjects table with resource assignment fields
-- This migration adds trainer, location, classroom, and class type fields
-- to make program plans complete, self-contained "recipes"

BEGIN;

-- Step 1: Add TRAINER role to the user_role enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'TRAINER';

-- Step 2: Create enum for class delivery types
CREATE TYPE class_type AS ENUM (
  'THEORY',
  'WORKSHOP', 
  'LAB',
  'ONLINE',
  'HYBRID',
  'ASSESSMENT'
);

-- Step 3: Add resource assignment columns to program_plan_subjects
ALTER TABLE public.program_plan_subjects
  ADD COLUMN trainer_id UUID REFERENCES public.profiles(id),
  ADD COLUMN location_id UUID REFERENCES public.delivery_locations(id),
  ADD COLUMN classroom_id UUID REFERENCES public.classrooms(id),
  ADD COLUMN class_type class_type;

-- Step 4: Add comments for clarity
COMMENT ON COLUMN public.program_plan_subjects.trainer_id IS 'The assigned trainer/tutor for this subject instance';
COMMENT ON COLUMN public.program_plan_subjects.location_id IS 'The delivery location for this subject instance';
COMMENT ON COLUMN public.program_plan_subjects.classroom_id IS 'The specific classroom at the location';
COMMENT ON COLUMN public.program_plan_subjects.class_type IS 'The delivery mode/type for this subject instance';

COMMIT;
