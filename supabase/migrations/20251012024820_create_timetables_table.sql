BEGIN;

-- Create the timetables table
CREATE TABLE public.timetables (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  name TEXT NOT NULL,
  program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  rto_id UUID NOT NULL REFERENCES public.rtos(id) ON DELETE CASCADE,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.timetables IS 'Top-level entity containing multiple program plan cycles for roll-over enrollment logic.';
COMMENT ON COLUMN public.timetables.name IS 'Free-form name for the timetable (e.g., "Diploma of Business 2025-2027")';
COMMENT ON COLUMN public.timetables.program_id IS 'The program this timetable belongs to';
COMMENT ON COLUMN public.timetables.rto_id IS 'The RTO that owns this timetable';
COMMENT ON COLUMN public.timetables.is_archived IS 'Soft delete flag - archived timetables are hidden from active use';

-- Enable RLS
ALTER TABLE public.timetables ENABLE ROW LEVEL SECURITY;

-- RLS policies (mirror existing tenancy model)
DO $$ BEGIN
  CREATE POLICY rls_timetables_all ON public.timetables FOR ALL USING (rto_id = public.get_my_rto_id()) WITH CHECK (rto_id = public.get_my_rto_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Add timetable_id column to program_plans table
ALTER TABLE public.program_plans
ADD COLUMN timetable_id UUID REFERENCES public.timetables(id) ON DELETE CASCADE;

COMMENT ON COLUMN public.program_plans.timetable_id IS 'Links this program plan to a parent timetable for multi-cycle management.';

-- Create index for efficient querying
CREATE INDEX idx_timetables_program ON public.timetables(program_id);
CREATE INDEX idx_timetables_rto ON public.timetables(rto_id);
CREATE INDEX idx_program_plans_timetable ON public.program_plans(timetable_id);

COMMIT;
