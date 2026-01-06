-- Add group_id to program_plan_classes table for group-specific class scheduling
BEGIN;

-- Step 1: Add group_id column (nullable initially for data migration)
ALTER TABLE public.program_plan_classes 
  ADD COLUMN group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE;

COMMENT ON COLUMN public.program_plan_classes.group_id IS 'The group this class is scheduled for (allows class duplication per group)';

-- Step 2: Create index for efficient querying
CREATE INDEX idx_program_plan_classes_group ON public.program_plan_classes(group_id);

-- Step 3: Create composite index for common filter queries (group + location)
CREATE INDEX idx_program_plan_classes_group_location ON public.program_plan_classes(group_id, location_id);

-- Note: We will make this NOT NULL in a subsequent migration after we migrate existing data

COMMIT;

