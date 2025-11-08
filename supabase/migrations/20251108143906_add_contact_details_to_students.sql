-- Add contact detail fields to students table
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS work_phone TEXT,
  ADD COLUMN IF NOT EXISTS mobile_phone TEXT,
  ADD COLUMN IF NOT EXISTS alternative_email TEXT;

COMMENT ON COLUMN public.students.work_phone IS 'Student work phone number';
COMMENT ON COLUMN public.students.mobile_phone IS 'Student mobile phone number';
COMMENT ON COLUMN public.students.alternative_email IS 'Student alternative email address';

