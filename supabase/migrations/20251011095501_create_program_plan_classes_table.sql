-- Create the program_plan_classes table for individual class sessions
-- This implements the correct three-tier architecture: Program Plan -> Subject -> Classes

BEGIN;

-- Create the program_plan_classes table
CREATE TABLE public.program_plan_classes (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  program_plan_subject_id UUID NOT NULL REFERENCES public.program_plan_subjects(id) ON DELETE CASCADE,
  
  -- Class scheduling
  class_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  
  -- Resource assignments
  trainer_id UUID REFERENCES public.profiles(id),
  location_id UUID REFERENCES public.delivery_locations(id),
  classroom_id UUID REFERENCES public.classrooms(id),
  class_type class_type,
  
  -- Additional metadata
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.program_plan_classes IS 'Individual class sessions within a program plan subject, with specific dates, times, and resource assignments';
COMMENT ON COLUMN public.program_plan_classes.program_plan_subject_id IS 'The subject this class belongs to';
COMMENT ON COLUMN public.program_plan_classes.class_date IS 'The date this class session occurs';
COMMENT ON COLUMN public.program_plan_classes.start_time IS 'Start time of the class session';
COMMENT ON COLUMN public.program_plan_classes.end_time IS 'End time of the class session';
COMMENT ON COLUMN public.program_plan_classes.trainer_id IS 'The assigned trainer for this class session';
COMMENT ON COLUMN public.program_plan_classes.location_id IS 'The delivery location for this class session';
COMMENT ON COLUMN public.program_plan_classes.classroom_id IS 'The specific classroom for this class session';
COMMENT ON COLUMN public.program_plan_classes.class_type IS 'The delivery mode/type for this class session';

-- Create index for efficient querying
CREATE INDEX idx_program_plan_classes_subject ON public.program_plan_classes(program_plan_subject_id);
CREATE INDEX idx_program_plan_classes_date ON public.program_plan_classes(class_date);

-- Enable RLS
ALTER TABLE public.program_plan_classes ENABLE ROW LEVEL SECURITY;

-- RLS Policy (same as other program plan tables)
CREATE POLICY "Users can view classes for their RTO"
  ON public.program_plan_classes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.program_plan_subjects pps
      JOIN public.program_plans pp ON pps.program_plan_id = pp.id
      WHERE pps.id = program_plan_classes.program_plan_subject_id
      AND pp.rto_id = (SELECT rto_id FROM public.profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can manage classes for their RTO"
  ON public.program_plan_classes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.program_plan_subjects pps
      JOIN public.program_plans pp ON pps.program_plan_id = pp.id
      WHERE pps.id = program_plan_classes.program_plan_subject_id
      AND pp.rto_id = (SELECT rto_id FROM public.profiles WHERE id = auth.uid())
    )
  );

COMMIT;
