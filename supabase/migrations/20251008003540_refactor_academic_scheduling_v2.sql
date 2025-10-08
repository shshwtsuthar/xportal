BEGIN;

-- Step 1: Global Unit -> Subject refactor
-- Rename units_of_competency to subjects (idempotent-safe: only if exists)
DO $$ BEGIN
  PERFORM 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'units_of_competency';
  IF FOUND THEN
    ALTER TABLE public.units_of_competency RENAME TO subjects;
  END IF;
END $$;

-- Temporarily rename program_units so we can drop it safely after
DO $$ BEGIN
  PERFORM 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'program_units';
  IF FOUND THEN
    ALTER TABLE public.program_units RENAME TO old_program_subjects_to_drop;
  END IF;
END $$;

-- Step 2: Drop legacy timetabling tables if present
DROP TABLE IF EXISTS public.enrollment_units CASCADE;
DROP TABLE IF EXISTS public.unit_offerings CASCADE;
DROP TABLE IF EXISTS public.terms CASCADE;
DROP TABLE IF EXISTS public.old_program_subjects_to_drop CASCADE;

-- Step 3: New Program Plans schema
CREATE TABLE IF NOT EXISTS public.program_plans (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  rto_id uuid NOT NULL REFERENCES public.rtos(id) ON DELETE CASCADE,
  program_id uuid NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  name text NOT NULL,
  UNIQUE(program_id, name)
);
COMMENT ON TABLE public.program_plans IS 'Stores a named, reusable academic schedule or "plan" for a program.';

CREATE TABLE IF NOT EXISTS public.program_plan_subjects (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  program_plan_id uuid NOT NULL REFERENCES public.program_plans(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  median_date date NOT NULL,
  sequence_order int,
  is_prerequisite boolean NOT NULL DEFAULT false,
  UNIQUE(program_plan_id, subject_id, start_date)
);
COMMENT ON TABLE public.program_plan_subjects IS 'Defines the structure and schedule for a subject within a specific program plan.';

-- Step 4: Enrollment subjects tracking
CREATE TABLE IF NOT EXISTS public.enrollment_subjects (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  enrollment_id uuid NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
  program_plan_subject_id uuid NOT NULL REFERENCES public.program_plan_subjects(id) ON DELETE CASCADE,
  outcome_code text,
  start_date date,
  end_date date,
  is_catch_up boolean DEFAULT false,
  -- (AVETMISS COMPLIANCE - NAT00120)
  delivery_location_id uuid REFERENCES public.delivery_locations(id),
  delivery_mode_id text,
  scheduled_hours int
);
COMMENT ON TABLE public.enrollment_subjects IS 'Connects a student enrollment to a specific scheduled subject, tracking their progress (NAT00120).';

-- Step 5: Applications link to program plan
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'applications' AND column_name = 'program_plan_id'
  ) THEN
    ALTER TABLE public.applications
      ADD COLUMN program_plan_id uuid REFERENCES public.program_plans(id);
  END IF;
END $$;

-- Step 6: Trigger to auto-calc median_date
CREATE OR REPLACE FUNCTION public.calculate_median_date()
RETURNS trigger AS $$
BEGIN
  NEW.median_date := NEW.start_date + floor((NEW.end_date - NEW.start_date) / 2)::integer;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_median_date_before_ins_upd ON public.program_plan_subjects;
CREATE TRIGGER set_median_date_before_ins_upd
BEFORE INSERT OR UPDATE ON public.program_plan_subjects
FOR EACH ROW
EXECUTE FUNCTION public.calculate_median_date();

-- Step 7: RLS policies
ALTER TABLE public.program_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_plan_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollment_subjects ENABLE ROW LEVEL SECURITY;

-- program_plans: tenant read/write by rto_id
DO $$ BEGIN
  CREATE POLICY program_plans_tenant_rw ON public.program_plans
    USING (
      rto_id::text = ((auth.jwt() ->> 'app_metadata')::jsonb ->> 'rto_id')
    )
    WITH CHECK (
      rto_id::text = ((auth.jwt() ->> 'app_metadata')::jsonb ->> 'rto_id')
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- program_plan_subjects: via parent program_plans rto_id
DO $$ BEGIN
  CREATE POLICY program_plan_subjects_tenant_rw ON public.program_plan_subjects
  USING (
    EXISTS (
      SELECT 1 FROM public.program_plans p
      WHERE p.id = program_plan_id
        AND p.rto_id::text = ((auth.jwt() ->> 'app_metadata')::jsonb ->> 'rto_id')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.program_plans p
      WHERE p.id = program_plan_id
        AND p.rto_id::text = ((auth.jwt() ->> 'app_metadata')::jsonb ->> 'rto_id')
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- enrollment_subjects: via enrollment -> applications/programs tenant context
-- For simplicity, allow read/write if enrollment is visible to the tenant
DO $$ BEGIN
  CREATE POLICY enrollment_subjects_tenant_rw ON public.enrollment_subjects
  USING (
    EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.id = enrollment_id
        AND e.rto_id::text = ((auth.jwt() ->> 'app_metadata')::jsonb ->> 'rto_id')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.id = enrollment_id
        AND e.rto_id::text = ((auth.jwt() ->> 'app_metadata')::jsonb ->> 'rto_id')
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMIT;


