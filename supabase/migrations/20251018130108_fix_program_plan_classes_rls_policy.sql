-- Fix RLS policies for program_plan_classes table
-- The original policies were using profiles table to get rto_id,
-- but users have rto_id in app_metadata instead

BEGIN;

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view classes for their RTO" ON public.program_plan_classes;
DROP POLICY IF EXISTS "Users can manage classes for their RTO" ON public.program_plan_classes;

-- Create corrected policies that use app_metadata from JWT
CREATE POLICY "Users can view classes for their RTO" 
  ON public.program_plan_classes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.program_plan_subjects pps
      JOIN public.program_plans pp ON pps.program_plan_id = pp.id
      WHERE pps.id = program_plan_classes.program_plan_subject_id
      AND pp.rto_id::text = ((auth.jwt() ->> 'app_metadata')::jsonb ->> 'rto_id')
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
      AND pp.rto_id::text = ((auth.jwt() ->> 'app_metadata')::jsonb ->> 'rto_id')
    )
  );

COMMIT;
