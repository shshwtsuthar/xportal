-- Add group_id column to program_plans table
BEGIN;

-- Add group_id column to program_plans
ALTER TABLE public.program_plans
ADD COLUMN group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE;

COMMENT ON COLUMN public.program_plans.group_id IS 'The group this program plan belongs to (optional, for capacity management)';

-- Create index for efficient querying
CREATE INDEX idx_program_plans_group ON public.program_plans(group_id);

COMMIT;

