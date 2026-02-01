-- Add AVETMISS NAT00120 Funding source - national columns (part 1/3)
-- Single DO block so the migration runner sees one statement
DO $$
BEGIN
  ALTER TABLE public.program_plan_subjects
    ADD COLUMN IF NOT EXISTS funding_source_national text;

  ALTER TABLE public.application_learning_subjects
    ADD COLUMN IF NOT EXISTS funding_source_national text;

  ALTER TABLE public.enrollment_subjects
    ADD COLUMN IF NOT EXISTS funding_source_national text;

  COMMENT ON COLUMN public.program_plan_subjects.funding_source_national IS 'AVETMISS NAT00120: predominant funding source for this subject (2-char code)';
  COMMENT ON COLUMN public.application_learning_subjects.funding_source_national IS 'AVETMISS NAT00120: copied from program_plan_subjects at freeze';
  COMMENT ON COLUMN public.enrollment_subjects.funding_source_national IS 'AVETMISS NAT00120: copied from application_learning_subjects at approve';
END
$$;
