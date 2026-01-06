-- Add location_id to groups table and update unique constraint
BEGIN;

-- Step 1: Add location_id column (nullable initially for data migration)
ALTER TABLE public.groups 
  ADD COLUMN location_id UUID REFERENCES public.delivery_locations(id) ON DELETE CASCADE;

COMMENT ON COLUMN public.groups.location_id IS 'The delivery location where this group operates (1:1 relationship)';

-- Step 2: Create index for efficient querying
CREATE INDEX idx_groups_location ON public.groups(location_id);

-- Note: We will make this NOT NULL and update unique constraint in a subsequent migration
-- after we migrate existing data

COMMIT;

