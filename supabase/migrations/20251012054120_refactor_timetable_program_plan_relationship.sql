BEGIN;

-- Remove timetable_id from program_plans table
ALTER TABLE public.program_plans DROP COLUMN IF EXISTS timetable_id;

-- Create junction table for many-to-many relationship
CREATE TABLE public.timetable_program_plans (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  timetable_id UUID NOT NULL REFERENCES public.timetables(id) ON DELETE CASCADE,
  program_plan_id UUID NOT NULL REFERENCES public.program_plans(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(timetable_id, program_plan_id)
);

COMMENT ON TABLE public.timetable_program_plans IS 'Junction table linking timetables to program plans (many-to-many).';

-- Enable RLS
ALTER TABLE public.timetable_program_plans ENABLE ROW LEVEL SECURITY;

-- RLS policies
DO $$ BEGIN
  CREATE POLICY rls_timetable_program_plans_all ON public.timetable_program_plans FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.timetables t
      WHERE t.id = timetable_program_plans.timetable_id
      AND t.rto_id = public.get_my_rto_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.timetables t
      WHERE t.id = timetable_program_plans.timetable_id
      AND t.rto_id = public.get_my_rto_id()
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Create indexes
CREATE INDEX idx_timetable_program_plans_timetable ON public.timetable_program_plans(timetable_id);
CREATE INDEX idx_timetable_program_plans_program_plan ON public.timetable_program_plans(program_plan_id);

COMMIT;
