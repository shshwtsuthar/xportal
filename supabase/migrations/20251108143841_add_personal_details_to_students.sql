-- Add personal detail fields to students table
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS salutation TEXT,
  ADD COLUMN IF NOT EXISTS middle_name TEXT,
  ADD COLUMN IF NOT EXISTS preferred_name TEXT;

COMMENT ON COLUMN public.students.salutation IS 'Student salutation (Mr/Ms/Dr)';
COMMENT ON COLUMN public.students.middle_name IS 'Student middle name';
COMMENT ON COLUMN public.students.preferred_name IS 'Student preferred name';

