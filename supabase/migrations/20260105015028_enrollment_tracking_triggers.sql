-- Create triggers to automatically track enrollment counts per group
BEGIN;

-- Function to update group enrollment count when application status changes
CREATE OR REPLACE FUNCTION public.update_group_enrollment_count()
RETURNS TRIGGER AS $$
DECLARE
  old_group_id UUID;
  new_group_id UUID;
BEGIN
  -- Helper function to get group_id from application's timetable
  -- Path: application.timetable_id → timetable_program_plans → program_plans.group_id
  
  IF TG_OP = 'DELETE' THEN
    -- When deleting an application, decrement if it was approved
    IF OLD.status = 'APPROVED' AND OLD.timetable_id IS NOT NULL THEN
      SELECT pp.group_id INTO old_group_id
      FROM public.timetable_program_plans tpp
      JOIN public.program_plans pp ON pp.id = tpp.program_plan_id
      WHERE tpp.timetable_id = OLD.timetable_id
      LIMIT 1;
      
      IF old_group_id IS NOT NULL THEN
        UPDATE public.groups
        SET current_enrollment_count = GREATEST(0, current_enrollment_count - 1)
        WHERE id = old_group_id;
      END IF;
    END IF;
    RETURN OLD;
  END IF;
  
  IF TG_OP = 'INSERT' THEN
    -- When inserting a new application with APPROVED status
    IF NEW.status = 'APPROVED' AND NEW.timetable_id IS NOT NULL THEN
      SELECT pp.group_id INTO new_group_id
      FROM public.timetable_program_plans tpp
      JOIN public.program_plans pp ON pp.id = tpp.program_plan_id
      WHERE tpp.timetable_id = NEW.timetable_id
      LIMIT 1;
      
      IF new_group_id IS NOT NULL THEN
        UPDATE public.groups
        SET current_enrollment_count = current_enrollment_count + 1
        WHERE id = new_group_id;
      END IF;
    END IF;
    RETURN NEW;
  END IF;
  
  IF TG_OP = 'UPDATE' THEN
    -- Get old group_id if applicable
    IF OLD.status = 'APPROVED' AND OLD.timetable_id IS NOT NULL THEN
      SELECT pp.group_id INTO old_group_id
      FROM public.timetable_program_plans tpp
      JOIN public.program_plans pp ON pp.id = tpp.program_plan_id
      WHERE tpp.timetable_id = OLD.timetable_id
      LIMIT 1;
    END IF;
    
    -- Get new group_id if applicable
    IF NEW.status = 'APPROVED' AND NEW.timetable_id IS NOT NULL THEN
      SELECT pp.group_id INTO new_group_id
      FROM public.timetable_program_plans tpp
      JOIN public.program_plans pp ON pp.id = tpp.program_plan_id
      WHERE tpp.timetable_id = NEW.timetable_id
      LIMIT 1;
    END IF;
    
    -- Handle status change from APPROVED to something else
    IF OLD.status = 'APPROVED' AND NEW.status != 'APPROVED' AND old_group_id IS NOT NULL THEN
      UPDATE public.groups
      SET current_enrollment_count = GREATEST(0, current_enrollment_count - 1)
      WHERE id = old_group_id;
    END IF;
    
    -- Handle status change to APPROVED from something else
    IF OLD.status != 'APPROVED' AND NEW.status = 'APPROVED' AND new_group_id IS NOT NULL THEN
      UPDATE public.groups
      SET current_enrollment_count = current_enrollment_count + 1
      WHERE id = new_group_id;
    END IF;
    
    -- Handle timetable change while status remains APPROVED
    IF OLD.status = 'APPROVED' AND NEW.status = 'APPROVED' AND 
       OLD.timetable_id IS DISTINCT FROM NEW.timetable_id THEN
      -- Decrement old group
      IF old_group_id IS NOT NULL THEN
        UPDATE public.groups
        SET current_enrollment_count = GREATEST(0, current_enrollment_count - 1)
        WHERE id = old_group_id;
      END IF;
      -- Increment new group
      IF new_group_id IS NOT NULL THEN
        UPDATE public.groups
        SET current_enrollment_count = current_enrollment_count + 1
        WHERE id = new_group_id;
      END IF;
    END IF;
    
    RETURN NEW;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on applications table
DROP TRIGGER IF EXISTS update_group_enrollment_count_trigger ON public.applications;
CREATE TRIGGER update_group_enrollment_count_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.applications
FOR EACH ROW
EXECUTE FUNCTION public.update_group_enrollment_count();

-- Function to prevent enrollment when group is at capacity
CREATE OR REPLACE FUNCTION public.prevent_enrollment_over_capacity()
RETURNS TRIGGER AS $$
DECLARE
  target_group_id UUID;
  group_max_capacity INT;
  group_current_count INT;
BEGIN
  -- Only check when status is being set to APPROVED
  IF NEW.status = 'APPROVED' AND NEW.timetable_id IS NOT NULL THEN
    -- Get the group_id from the timetable
    SELECT pp.group_id INTO target_group_id
    FROM public.timetable_program_plans tpp
    JOIN public.program_plans pp ON pp.id = tpp.program_plan_id
    WHERE tpp.timetable_id = NEW.timetable_id
    LIMIT 1;
    
    IF target_group_id IS NOT NULL THEN
      -- Get group capacity and current count
      SELECT max_capacity, current_enrollment_count
      INTO group_max_capacity, group_current_count
      FROM public.groups
      WHERE id = target_group_id;
      
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

-- Create trigger to check capacity before enrollment
DROP TRIGGER IF EXISTS prevent_enrollment_over_capacity_trigger ON public.applications;
CREATE TRIGGER prevent_enrollment_over_capacity_trigger
BEFORE INSERT OR UPDATE OF status, timetable_id ON public.applications
FOR EACH ROW
EXECUTE FUNCTION public.prevent_enrollment_over_capacity();

COMMIT;

