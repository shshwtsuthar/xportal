BEGIN;

-- Rename primary and join tables
ALTER TABLE public.qualifications RENAME TO programs;
ALTER TABLE public.qualification_units RENAME TO program_units;

-- Rename referencing columns
ALTER TABLE public.applications RENAME COLUMN qualification_id TO program_id;
ALTER TABLE public.enrollments RENAME COLUMN qualification_id TO program_id;
ALTER TABLE public.payment_plan_templates RENAME COLUMN qualification_id TO program_id;
ALTER TABLE public.program_units RENAME COLUMN qualification_id TO program_id;

-- Safely rename constraints if they exist
DO $$ BEGIN
  ALTER TABLE public.programs RENAME CONSTRAINT qualifications_pkey TO programs_pkey;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.programs RENAME CONSTRAINT qualifications_rto_id_code_key TO programs_rto_id_code_key;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.applications RENAME CONSTRAINT applications_qualification_id_fkey TO applications_program_id_fkey;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.enrollments RENAME CONSTRAINT enrollments_qualification_id_fkey TO enrollments_program_id_fkey;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.payment_plan_templates RENAME CONSTRAINT payment_plan_templates_qualification_id_fkey TO payment_plan_templates_program_id_fkey;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.program_units RENAME CONSTRAINT qualification_units_qualification_id_fkey TO program_units_program_id_fkey;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

-- Documentation
COMMENT ON TABLE public.programs IS 'The courses or programs offered by the RTO (AVETMISS Programs - NAT00030).';

COMMIT;


