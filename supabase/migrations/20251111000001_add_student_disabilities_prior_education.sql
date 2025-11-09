-- Add student_disabilities and student_prior_education tables
-- Add disability_flag and prior_education_flag to student_avetmiss
-- AVETMISS Compliance: NAT00090 (student_disabilities), NAT00085 (student_prior_education)

-- Add flags to student_avetmiss table
ALTER TABLE public.student_avetmiss
  ADD COLUMN IF NOT EXISTS disability_flag TEXT NULL,
  ADD COLUMN IF NOT EXISTS prior_education_flag TEXT NULL;

COMMENT ON COLUMN public.student_avetmiss.disability_flag IS 'NAT00080: Disability Flag. Y = Yes, N = No. Copied from application on approval.';
COMMENT ON COLUMN public.student_avetmiss.prior_education_flag IS 'NAT00085: Prior Educational Achievement Flag. Y = Yes, N = No. Copied from application on approval.';

-- (AVETMISS COMPLIANCE - NAT00090)
CREATE TABLE IF NOT EXISTS public.student_disabilities (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    rto_id UUID NOT NULL REFERENCES public.rtos(id) ON DELETE CASCADE,
    disability_type_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
COMMENT ON TABLE public.student_disabilities IS 'Stores student disability types, one record per type (NAT00090). Copied from application_disabilities on approval.';

-- (AVETMISS COMPLIANCE - NAT00085)
CREATE TABLE IF NOT EXISTS public.student_prior_education (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    rto_id UUID NOT NULL REFERENCES public.rtos(id) ON DELETE CASCADE,
    prior_achievement_id TEXT NOT NULL,
    recognition_type TEXT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
COMMENT ON TABLE public.student_prior_education IS 'Stores student prior education achievements, one record per qualification (NAT00085). Copied from application_prior_education on approval.';

-- Add audit triggers
CREATE TRIGGER audit_student_disability_changes AFTER INSERT OR UPDATE OR DELETE ON public.student_disabilities FOR EACH ROW EXECUTE FUNCTION public.record_change();
CREATE TRIGGER audit_student_prior_ed_changes AFTER INSERT OR UPDATE OR DELETE ON public.student_prior_education FOR EACH ROW EXECUTE FUNCTION public.record_change();

