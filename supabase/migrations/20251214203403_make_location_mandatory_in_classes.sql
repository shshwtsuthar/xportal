BEGIN;

-- Make location_id mandatory in program_plan_classes table
-- First, handle existing NULL values by setting them to a default location if available
-- If no default location exists, we'll need to handle this case

-- Step 1: Check if there are any NULL location_id values
DO $$
DECLARE
  null_count INTEGER;
  default_location_id UUID;
BEGIN
  SELECT COUNT(*) INTO null_count 
  FROM public.program_plan_classes 
  WHERE location_id IS NULL;
  
  IF null_count > 0 THEN
    -- Try to get the first available location for the RTO
    -- We'll use the first location found for each RTO's classes
    -- This is a best-effort migration - ideally all classes should already have locations
    FOR default_location_id IN 
      SELECT DISTINCT dl.id
      FROM public.delivery_locations dl
      WHERE EXISTS (
        SELECT 1 
        FROM public.program_plan_classes ppc
        JOIN public.program_plan_subjects pps ON ppc.program_plan_subject_id = pps.id
        JOIN public.program_plans pp ON pps.program_plan_id = pp.id
        WHERE ppc.location_id IS NULL
        AND pp.rto_id = dl.rto_id
      )
      LIMIT 1
    LOOP
      -- Update NULL location_id values with the default location for their RTO
      UPDATE public.program_plan_classes ppc
      SET location_id = default_location_id
      FROM public.program_plan_subjects pps
      JOIN public.program_plans pp ON pps.program_plan_id = pp.id
      WHERE ppc.program_plan_subject_id = pps.id
        AND ppc.location_id IS NULL
        AND pp.rto_id = (SELECT rto_id FROM public.delivery_locations WHERE id = default_location_id);
    END LOOP;
    
    -- If there are still NULL values after migration, raise a warning
    SELECT COUNT(*) INTO null_count 
    FROM public.program_plan_classes 
    WHERE location_id IS NULL;
    
    IF null_count > 0 THEN
      RAISE WARNING 'There are still % classes with NULL location_id. These must be manually updated before making the column NOT NULL.', null_count;
    END IF;
  END IF;
END $$;

-- Step 2: Make location_id NOT NULL
-- This will fail if there are still NULL values, which is intentional
ALTER TABLE public.program_plan_classes
  ALTER COLUMN location_id SET NOT NULL;

COMMENT ON COLUMN public.program_plan_classes.location_id IS 'The delivery location for this class session (MANDATORY)';

COMMIT;
