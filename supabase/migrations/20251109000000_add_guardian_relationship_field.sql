-- Add guardian relationship field to applications table
-- This field stores the relationship of the parent/legal guardian to the student
-- when the provider is not accepting welfare responsibility (CRICOS compliance)

ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS g_relationship TEXT;

COMMENT ON COLUMN public.applications.g_relationship IS 'CRICOS: Parent/Legal Guardian relationship to student (e.g., Father, Mother) when provider is not accepting welfare responsibility';

