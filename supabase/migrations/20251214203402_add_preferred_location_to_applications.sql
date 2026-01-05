BEGIN;

-- Add preferred_location_id column to applications table
-- This field stores the student's preferred delivery location selected during enrollment

-- Step 1: Add column as nullable first
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS preferred_location_id UUID REFERENCES public.delivery_locations(id);

-- Step 2: Set default location for existing non-archived applications
-- Use the first available location for each RTO
UPDATE public.applications a
SET preferred_location_id = (
  SELECT dl.id
  FROM public.delivery_locations dl
  WHERE dl.rto_id = a.rto_id
  ORDER BY dl.name ASC
  LIMIT 1
)
WHERE a.preferred_location_id IS NULL
  AND a.status != 'ARCHIVED'
  AND EXISTS (
    SELECT 1
    FROM public.delivery_locations dl
    WHERE dl.rto_id = a.rto_id
  );

-- Step 2b: Set default location for archived applications
-- Temporarily disable the trigger to allow updating archived applications
ALTER TABLE public.applications DISABLE TRIGGER prevent_archived_application_edits;

UPDATE public.applications a
SET preferred_location_id = (
  SELECT dl.id
  FROM public.delivery_locations dl
  WHERE dl.rto_id = a.rto_id
  ORDER BY dl.name ASC
  LIMIT 1
)
WHERE a.preferred_location_id IS NULL
  AND a.status = 'ARCHIVED'
  AND EXISTS (
    SELECT 1
    FROM public.delivery_locations dl
    WHERE dl.rto_id = a.rto_id
  );

-- Re-enable the trigger
ALTER TABLE public.applications ENABLE TRIGGER prevent_archived_application_edits;

-- Step 3: Make the column NOT NULL
-- This will fail if there are still NULL values, which means no locations exist for that RTO
ALTER TABLE public.applications
  ALTER COLUMN preferred_location_id SET NOT NULL;

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_applications_preferred_location 
  ON public.applications(preferred_location_id);

COMMENT ON COLUMN public.applications.preferred_location_id IS 'The student''s preferred delivery location selected during the enrollment step of the application wizard (MANDATORY)';

COMMIT;
