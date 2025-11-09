-- Add disability_flag and prior_education_flag to applications table
-- Add recognition_type to application_prior_education table
-- AVETMISS Compliance: NAT00080 (disability_flag), NAT00085 (prior_education_flag, recognition_type)

-- Add disability_flag to applications table
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS disability_flag TEXT NULL;

COMMENT ON COLUMN public.applications.disability_flag IS 'NAT00080: Disability Flag. Y = Yes, N = No. Mandatory field.';

-- Add prior_education_flag to applications table
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS prior_education_flag TEXT NULL;

COMMENT ON COLUMN public.applications.prior_education_flag IS 'NAT00085: Prior Educational Achievement Flag. Y = Yes, N = No. Mandatory field.';

-- Add recognition_type to application_prior_education table
ALTER TABLE public.application_prior_education
  ADD COLUMN IF NOT EXISTS recognition_type TEXT NULL;

COMMENT ON COLUMN public.application_prior_education.recognition_type IS 'NAT00085: Recognition Type Indicator. A = Australian, E = Australian Equivalent, I = International. Required when prior_education_flag = Y.';

