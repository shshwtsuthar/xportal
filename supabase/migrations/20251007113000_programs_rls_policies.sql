BEGIN;

-- Enable RLS on programs and program_units
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_units ENABLE ROW LEVEL SECURITY;

-- Mirror existing tenancy model (similar to qualifications)
-- Allow all operations when the row belongs to caller's RTO
DO $$ BEGIN
  CREATE POLICY rls_programs_all ON public.programs FOR ALL USING (rto_id = public.get_my_rto_id()) WITH CHECK (rto_id = public.get_my_rto_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY rls_program_units_all ON public.program_units FOR ALL USING (
    (SELECT rto_id FROM public.programs WHERE id = program_id) = public.get_my_rto_id()
  ) WITH CHECK (
    (SELECT rto_id FROM public.programs WHERE id = program_id) = public.get_my_rto_id()
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMIT;


