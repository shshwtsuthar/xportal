-- Add group_id to applications table for enrollment tracking
BEGIN;

-- Step 1: Add group_id column (nullable initially, required after migration)
ALTER TABLE public.applications 
  ADD COLUMN group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.applications.group_id IS 'The group the student is enrolled in, used to filter classes by group at enrollment location';

-- Step 2: Create index for efficient querying
CREATE INDEX idx_applications_group ON public.applications(group_id);

-- Step 3: Create composite index for common filter queries (group + location)
CREATE INDEX idx_applications_group_location ON public.applications(group_id, preferred_location_id);

-- Note: This remains nullable to support DRAFT applications before group selection

COMMIT;

