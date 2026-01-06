-- Add enrollment validation to ensure Group+Location+Timetable consistency
BEGIN;

-- Function to validate enrollment data consistency
CREATE OR REPLACE FUNCTION public.validate_enrollment_consistency()
RETURNS TRIGGER AS $$
DECLARE
  v_class_count INTEGER;
  v_group_location UUID;
  v_program_id_from_timetable UUID;
  v_program_id_from_group UUID;
BEGIN
  -- Only validate if all three critical fields are set
  IF NEW.group_id IS NOT NULL 
     AND NEW.preferred_location_id IS NOT NULL 
     AND NEW.timetable_id IS NOT NULL 
     AND NEW.program_id IS NOT NULL THEN
    
    -- Validate 1: Check that the group belongs to the correct location
    SELECT g.location_id, g.program_id INTO v_group_location, v_program_id_from_group
    FROM public.groups g
    WHERE g.id = NEW.group_id;
    
    IF v_group_location IS NULL THEN
      RAISE EXCEPTION 'Selected group does not exist or has no location assigned';
    END IF;
    
    IF v_group_location != NEW.preferred_location_id THEN
      RAISE EXCEPTION 'Selected group does not operate at the selected location';
    END IF;
    
    -- Validate 2: Check that group belongs to the same program
    IF v_program_id_from_group != NEW.program_id THEN
      RAISE EXCEPTION 'Selected group does not belong to the selected program';
    END IF;
    
    -- Validate 3: Check that timetable belongs to the same program
    SELECT t.program_id INTO v_program_id_from_timetable
    FROM public.timetables t
    WHERE t.id = NEW.timetable_id;
    
    IF v_program_id_from_timetable != NEW.program_id THEN
      RAISE EXCEPTION 'Selected timetable does not belong to the selected program';
    END IF;
    
    -- Validate 4: Check that the timetable contains at least one class for this group at this location
    SELECT COUNT(*) INTO v_class_count
    FROM public.program_plan_classes ppc
    JOIN public.program_plan_subjects pps ON ppc.program_plan_subject_id = pps.id
    JOIN public.timetable_program_plans tpp ON pps.program_plan_id = tpp.program_plan_id
    WHERE tpp.timetable_id = NEW.timetable_id
      AND ppc.group_id = NEW.group_id
      AND ppc.location_id = NEW.preferred_location_id;
    
    IF v_class_count = 0 THEN
      RAISE EXCEPTION 'Selected timetable does not contain any classes for the selected group at the selected location. Please choose a different timetable, group, or location combination.';
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on applications table
DROP TRIGGER IF EXISTS validate_enrollment_consistency_trigger ON public.applications;
CREATE TRIGGER validate_enrollment_consistency_trigger
BEFORE INSERT OR UPDATE OF group_id, preferred_location_id, timetable_id, program_id
ON public.applications
FOR EACH ROW
EXECUTE FUNCTION public.validate_enrollment_consistency();

COMMENT ON FUNCTION public.validate_enrollment_consistency IS 'Validates that group, location, and timetable selections are consistent and that classes exist for the selected combination';

COMMIT;

