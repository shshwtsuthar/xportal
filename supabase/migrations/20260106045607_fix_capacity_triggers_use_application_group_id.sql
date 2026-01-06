-- Fix capacity tracking triggers to use applications.group_id directly
-- The original triggers tried to get group_id from program_plans.group_id, 
-- but that column was removed in migration 20260106040902_remove_group_id_from_program_plans.sql
BEGIN;

-- Function to update group enrollment count when application status changes
-- Now uses applications.group_id directly instead of joining through timetable → program_plans
CREATE OR REPLACE FUNCTION public.update_group_enrollment_count()
RETURNS TRIGGER AS $$
DECLARE
  old_group_id UUID;
  new_group_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    -- When deleting an application, decrement if it was approved
    IF OLD.status = 'APPROVED' AND OLD.group_id IS NOT NULL THEN
      UPDATE public.groups
      SET current_enrollment_count = GREATEST(0, current_enrollment_count - 1)
      WHERE id = OLD.group_id;
    END IF;
    RETURN OLD;
  END IF;
  
  IF TG_OP = 'INSERT' THEN
    -- When inserting a new application with APPROVED status
    IF NEW.status = 'APPROVED' AND NEW.group_id IS NOT NULL THEN
      UPDATE public.groups
      SET current_enrollment_count = current_enrollment_count + 1
      WHERE id = NEW.group_id;
    END IF;
    RETURN NEW;
  END IF;
  
  IF TG_OP = 'UPDATE' THEN
    -- Handle status change from APPROVED to something else
    IF OLD.status = 'APPROVED' AND NEW.status != 'APPROVED' AND OLD.group_id IS NOT NULL THEN
      UPDATE public.groups
      SET current_enrollment_count = GREATEST(0, current_enrollment_count - 1)
      WHERE id = OLD.group_id;
    END IF;
    
    -- Handle status change to APPROVED from something else
    IF OLD.status != 'APPROVED' AND NEW.status = 'APPROVED' AND NEW.group_id IS NOT NULL THEN
      UPDATE public.groups
      SET current_enrollment_count = current_enrollment_count + 1
      WHERE id = NEW.group_id;
    END IF;
    
    -- Handle group change while status remains APPROVED
    IF OLD.status = 'APPROVED' AND NEW.status = 'APPROVED' AND 
       OLD.group_id IS DISTINCT FROM NEW.group_id THEN
      -- Decrement old group
      IF OLD.group_id IS NOT NULL THEN
        UPDATE public.groups
        SET current_enrollment_count = GREATEST(0, current_enrollment_count - 1)
        WHERE id = OLD.group_id;
      END IF;
      -- Increment new group
      IF NEW.group_id IS NOT NULL THEN
        UPDATE public.groups
        SET current_enrollment_count = current_enrollment_count + 1
        WHERE id = NEW.group_id;
      END IF;
    END IF;
    
    RETURN NEW;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to prevent enrollment when group is at capacity
-- Now uses applications.group_id directly
CREATE OR REPLACE FUNCTION public.prevent_enrollment_over_capacity()
RETURNS TRIGGER AS $$
DECLARE
  group_max_capacity INT;
  group_current_count INT;
BEGIN
  -- Only check when status is being set to APPROVED and group_id is set
  IF NEW.status = 'APPROVED' AND NEW.group_id IS NOT NULL THEN
    -- Get group capacity and current count
    SELECT max_capacity, current_enrollment_count
    INTO group_max_capacity, group_current_count
    FROM public.groups
    WHERE id = NEW.group_id;
    
    IF group_max_capacity IS NOT NULL THEN
      -- Check if adding this student would exceed capacity
      -- We need to account for updates (if status was already APPROVED, don't double count)
      IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status != 'APPROVED') THEN
        IF group_current_count >= group_max_capacity THEN
          RAISE EXCEPTION 'Cannot enroll student: Group is at full capacity (% / %)', 
            group_current_count, group_max_capacity;
        END IF;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update trigger to watch group_id changes in addition to status
DROP TRIGGER IF EXISTS update_group_enrollment_count_trigger ON public.applications;
CREATE TRIGGER update_group_enrollment_count_trigger
AFTER INSERT OR UPDATE OF status, group_id OR DELETE ON public.applications
FOR EACH ROW
EXECUTE FUNCTION public.update_group_enrollment_count();

-- Update trigger to watch group_id changes in addition to status
DROP TRIGGER IF EXISTS prevent_enrollment_over_capacity_trigger ON public.applications;
CREATE TRIGGER prevent_enrollment_over_capacity_trigger
BEFORE INSERT OR UPDATE OF status, group_id ON public.applications
FOR EACH ROW
EXECUTE FUNCTION public.prevent_enrollment_over_capacity();

COMMENT ON FUNCTION public.update_group_enrollment_count IS 'Tracks enrollment counts using applications.group_id directly (fixed after group_id was removed from program_plans)';
COMMENT ON FUNCTION public.prevent_enrollment_over_capacity IS 'Prevents enrollment when group is at capacity using applications.group_id directly';

COMMIT;

