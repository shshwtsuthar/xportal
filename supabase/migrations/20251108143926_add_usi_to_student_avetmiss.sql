-- Add USI field to student_avetmiss table
ALTER TABLE public.student_avetmiss
  ADD COLUMN IF NOT EXISTS usi TEXT;

COMMENT ON COLUMN public.student_avetmiss.usi IS 'NAT00080: Unique Student Identifier (USI) - required for domestic students';

