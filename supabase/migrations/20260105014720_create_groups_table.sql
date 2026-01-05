-- Create groups table for managing classroom capacity and student enrollment
BEGIN;

-- Create the groups table
CREATE TABLE public.groups (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  rto_id UUID NOT NULL REFERENCES public.rtos(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  max_capacity INT NOT NULL CHECK (max_capacity >= 1),
  current_enrollment_count INT NOT NULL DEFAULT 0 CHECK (current_enrollment_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure group names are unique per program
  UNIQUE(program_id, name)
);

COMMENT ON TABLE public.groups IS 'Manages student groups with capacity constraints linked to programs';
COMMENT ON COLUMN public.groups.name IS 'Name of the group (e.g., "Group 1", "Morning Batch")';
COMMENT ON COLUMN public.groups.max_capacity IS 'Maximum number of students that can be enrolled in this group';
COMMENT ON COLUMN public.groups.current_enrollment_count IS 'Current number of students enrolled in this group (auto-updated by triggers)';

-- Create indexes for efficient querying
CREATE INDEX idx_groups_rto ON public.groups(rto_id);
CREATE INDEX idx_groups_program ON public.groups(program_id);

-- Enable RLS
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

-- RLS policies for tenant isolation
DO $$ BEGIN
  CREATE POLICY rls_groups_all ON public.groups 
  FOR ALL 
  USING (rto_id = public.get_my_rto_id()) 
  WITH CHECK (rto_id = public.get_my_rto_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Function to validate max_capacity does not exceed available classroom capacity
CREATE OR REPLACE FUNCTION public.validate_group_capacity()
RETURNS TRIGGER AS $$
DECLARE
  max_classroom_capacity INT;
BEGIN
  -- Get the maximum classroom capacity for this RTO
  SELECT COALESCE(MAX(capacity), 0)
  INTO max_classroom_capacity
  FROM public.classrooms
  WHERE rto_id = NEW.rto_id
    AND status = 'AVAILABLE';
  
  -- Only validate if there are classrooms available
  -- If max_classroom_capacity is 0 (no classrooms), allow any capacity
  IF max_classroom_capacity > 0 AND NEW.max_capacity > max_classroom_capacity THEN
    RAISE EXCEPTION 'Group max_capacity (%) exceeds maximum available classroom capacity (%). You do not have any classrooms of this capacity.', 
      NEW.max_capacity, max_classroom_capacity;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to validate capacity before insert or update
CREATE TRIGGER validate_group_capacity_trigger
BEFORE INSERT OR UPDATE OF max_capacity ON public.groups
FOR EACH ROW
EXECUTE FUNCTION public.validate_group_capacity();

-- Function to check enrollment capacity before allowing enrollment
CREATE OR REPLACE FUNCTION public.check_group_enrollment_capacity()
RETURNS TRIGGER AS $$
DECLARE
  group_max_capacity INT;
  group_current_count INT;
BEGIN
  -- This will be used later when we implement application enrollment logic
  -- For now, it's a placeholder that can be expanded
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMIT;