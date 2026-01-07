-- Create blackout dates tables for holiday/schedule exclusions
-- Supports both RTO-wide (public holidays) and program-specific blackout dates
BEGIN;

-- ============================================================================
-- PART 1: RTO-wide blackout dates (public holidays, RTO closures)
-- ============================================================================

CREATE TABLE public.rto_blackout_dates (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  rto_id UUID NOT NULL REFERENCES public.rtos(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Ensure no duplicate dates per RTO
  UNIQUE(rto_id, date)
);

COMMENT ON TABLE public.rto_blackout_dates IS 'RTO-wide blackout dates (public holidays, closures) that exclude class generation across all programs';
COMMENT ON COLUMN public.rto_blackout_dates.date IS 'Date to exclude from class generation';
COMMENT ON COLUMN public.rto_blackout_dates.reason IS 'Reason for blackout (e.g., "Christmas Day", "RTO Closure")';

-- Create index for efficient date range queries
CREATE INDEX idx_rto_blackout_dates_rto ON public.rto_blackout_dates(rto_id);
CREATE INDEX idx_rto_blackout_dates_date ON public.rto_blackout_dates(date);
CREATE INDEX idx_rto_blackout_dates_rto_date_range ON public.rto_blackout_dates(rto_id, date);

-- Enable RLS
ALTER TABLE public.rto_blackout_dates ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only manage blackout dates for their RTO
DO $$ BEGIN
  CREATE POLICY rls_rto_blackout_dates_all ON public.rto_blackout_dates 
  FOR ALL 
  USING (rto_id = public.get_my_rto_id()) 
  WITH CHECK (rto_id = public.get_my_rto_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- PART 2: Program-specific blackout dates
-- ============================================================================

CREATE TABLE public.program_plan_blackout_dates (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  program_plan_id UUID NOT NULL REFERENCES public.program_plans(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Ensure no duplicate dates per program plan
  UNIQUE(program_plan_id, date)
);

COMMENT ON TABLE public.program_plan_blackout_dates IS 'Program plan-specific blackout dates for program-level schedule exclusions';
COMMENT ON COLUMN public.program_plan_blackout_dates.date IS 'Date to exclude from class generation for this program plan';
COMMENT ON COLUMN public.program_plan_blackout_dates.reason IS 'Optional reason for program-specific blackout';

-- Create index for efficient date range queries
CREATE INDEX idx_program_plan_blackout_dates_plan ON public.program_plan_blackout_dates(program_plan_id);
CREATE INDEX idx_program_plan_blackout_dates_date ON public.program_plan_blackout_dates(date);
CREATE INDEX idx_program_plan_blackout_dates_plan_date_range ON public.program_plan_blackout_dates(program_plan_id, date);

-- Enable RLS
ALTER TABLE public.program_plan_blackout_dates ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only manage blackout dates for program plans in their RTO
DO $$ BEGIN
  CREATE POLICY rls_program_plan_blackout_dates_all ON public.program_plan_blackout_dates 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.program_plans pp
      WHERE pp.id = program_plan_blackout_dates.program_plan_id
      AND pp.rto_id = public.get_my_rto_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.program_plans pp
      WHERE pp.id = program_plan_blackout_dates.program_plan_id
      AND pp.rto_id = public.get_my_rto_id()
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMIT;

