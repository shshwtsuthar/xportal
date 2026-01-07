-- Create program_plan_class_templates table for recurring class patterns
-- Supports daily, weekly, monthly, and custom recurrence patterns
BEGIN;

-- ============================================================================
-- PART 1: Create recurrence_type enum
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE public.recurrence_type AS ENUM ('once', 'daily', 'weekly', 'monthly', 'custom');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMENT ON TYPE public.recurrence_type IS 'Type of class recurrence pattern: once (no recurrence), daily, weekly, monthly, or custom dates';

-- ============================================================================
-- PART 2: Create program_plan_class_templates table
-- ============================================================================

CREATE TABLE public.program_plan_class_templates (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  rto_id UUID NOT NULL REFERENCES public.rtos(id) ON DELETE CASCADE,
  program_plan_subject_id UUID NOT NULL REFERENCES public.program_plan_subjects(id) ON DELETE CASCADE,
  
  -- Template metadata
  template_name TEXT,
  
  -- Recurrence configuration
  recurrence_type public.recurrence_type NOT NULL DEFAULT 'once',
  
  -- Date range for recurrence
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  
  -- Recurrence pattern details (JSON for flexibility)
  -- Examples:
  -- once: {}
  -- daily: {"interval": 2} (every 2 days)
  -- weekly: {"interval": 1, "days_of_week": [0, 3]} (Sunday=0, Wednesday=3)
  -- monthly: {"interval": 1, "day_of_month": 15} (15th of each month)
  -- custom: {"dates": ["2025-01-10", "2025-01-17", "2025-02-05"]}
  recurrence_pattern JSONB NOT NULL DEFAULT '{}',
  
  -- Time configuration
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  
  -- Resource assignments (applied to all generated classes)
  trainer_id UUID REFERENCES public.profiles(id),
  location_id UUID NOT NULL REFERENCES public.delivery_locations(id),
  classroom_id UUID REFERENCES public.classrooms(id),
  group_id UUID NOT NULL REFERENCES public.groups(id),
  class_type public.class_type,
  notes TEXT,
  
  -- Expansion tracking
  is_expanded BOOLEAN NOT NULL DEFAULT false,
  expanded_at TIMESTAMPTZ,
  last_expanded_at TIMESTAMPTZ,
  generated_class_count INT NOT NULL DEFAULT 0,
  
  -- Conflict detection results (stored after expansion attempt)
  conflicts_detected JSONB DEFAULT '[]',
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Constraints
  CHECK (end_date >= start_date),
  CHECK (end_time > start_time),
  CHECK (generated_class_count >= 0)
);

COMMENT ON TABLE public.program_plan_class_templates IS 'Templates for recurring class patterns with automatic expansion to concrete class instances';
COMMENT ON COLUMN public.program_plan_class_templates.template_name IS 'Optional descriptive name for the template (e.g., "Weekly Sunday Workshop")';
COMMENT ON COLUMN public.program_plan_class_templates.recurrence_type IS 'Type of recurrence: once, daily, weekly, monthly, or custom';
COMMENT ON COLUMN public.program_plan_class_templates.recurrence_pattern IS 'JSONB structure defining the recurrence pattern (varies by type)';
COMMENT ON COLUMN public.program_plan_class_templates.is_expanded IS 'Whether this template has been expanded to concrete classes';
COMMENT ON COLUMN public.program_plan_class_templates.last_expanded_at IS 'Timestamp of most recent expansion';
COMMENT ON COLUMN public.program_plan_class_templates.generated_class_count IS 'Number of concrete classes generated from this template';
COMMENT ON COLUMN public.program_plan_class_templates.conflicts_detected IS 'Array of conflicts detected during last expansion attempt';

-- ============================================================================
-- PART 3: Create indexes
-- ============================================================================

CREATE INDEX idx_class_templates_rto ON public.program_plan_class_templates(rto_id);
CREATE INDEX idx_class_templates_subject ON public.program_plan_class_templates(program_plan_subject_id);
CREATE INDEX idx_class_templates_group_location ON public.program_plan_class_templates(group_id, location_id);
CREATE INDEX idx_class_templates_expanded ON public.program_plan_class_templates(is_expanded);
CREATE INDEX idx_class_templates_dates ON public.program_plan_class_templates(start_date, end_date);

-- ============================================================================
-- PART 4: Enable RLS and create policies
-- ============================================================================

ALTER TABLE public.program_plan_class_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only manage templates for their RTO
DO $$ BEGIN
  CREATE POLICY rls_class_templates_all ON public.program_plan_class_templates 
  FOR ALL 
  USING (rto_id = public.get_my_rto_id()) 
  WITH CHECK (rto_id = public.get_my_rto_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- PART 5: Create trigger to update updated_at timestamp
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_class_template_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_class_template_updated_at ON public.program_plan_class_templates;
CREATE TRIGGER set_class_template_updated_at
BEFORE UPDATE ON public.program_plan_class_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_class_template_updated_at();

COMMIT;

