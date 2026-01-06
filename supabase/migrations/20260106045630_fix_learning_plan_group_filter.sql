-- Fix learning plan freezing to filter classes by group_id and location_id
-- This ensures students only get classes for their assigned group at their preferred location
BEGIN;

-- Update the upsert_enrollment_plan function to add group_id and location_id filters
CREATE OR REPLACE FUNCTION public.upsert_enrollment_plan(
  app_id UUID,
  timetable_id UUID,
  proposed_commencement_date DATE
)
RETURNS TABLE(subjects_count INT, classes_count INT) AS $$
DECLARE
  v_subjects INT;
  v_classes INT;
  v_program_plan_id UUID;
  v_cycle_number INT;
  v_subject_count INT;
BEGIN
  -- Delete existing snapshot data for this application
  DELETE FROM public.application_learning_classes WHERE application_id = app_id;
  DELETE FROM public.application_learning_subjects WHERE application_id = app_id;

  -- Find the program plan from timetable
  SELECT tpp.program_plan_id INTO v_program_plan_id
  FROM public.timetable_program_plans tpp
  WHERE tpp.timetable_id = upsert_enrollment_plan.timetable_id
  LIMIT 1;

  IF v_program_plan_id IS NULL THEN
    RAISE EXCEPTION 'No program plan found for timetable %', timetable_id;
  END IF;

  -- Count subjects in the program plan
  SELECT COUNT(*) INTO v_subject_count
  FROM public.program_plan_subjects
  WHERE program_plan_id = v_program_plan_id;

  IF v_subject_count = 0 THEN
    RAISE EXCEPTION 'Program plan % has no subjects', v_program_plan_id;
  END IF;

  -- Calculate cycle number based on commencement date
  WITH subject_dates AS (
    SELECT 
      MIN(pps.planned_start_date) AS min_start,
      MAX(pps.planned_end_date) AS max_end,
      -- Calculate total duration in days
      MAX(pps.planned_end_date) - MIN(pps.planned_start_date) AS total_duration
    FROM public.program_plan_subjects pps
    WHERE pps.program_plan_id = v_program_plan_id
  ),
  cycle_calc AS (
    SELECT 
      -- If proposed_commencement_date is before the plan start, cycle = 0
      -- If it's within the plan dates, cycle = 0
      -- If it's after plan end, calculate which cycle based on days elapsed
      CASE 
        WHEN proposed_commencement_date <= min_start THEN 0
        WHEN proposed_commencement_date BETWEEN min_start AND max_end THEN 0
        ELSE FLOOR((proposed_commencement_date - max_end)::numeric / NULLIF(total_duration, 0)) + 1
      END AS cycle
    FROM subject_dates
  )
  SELECT cycle INTO v_cycle_number FROM cycle_calc;

  -- Handle NULL cycle (shouldn't happen, but safety net)
  v_cycle_number := COALESCE(v_cycle_number, 0);

  -- Insert subjects into snapshot table with adjusted dates based on cycle
  WITH subject_dates AS (
    SELECT 
      MIN(pps.planned_start_date) AS min_start,
      MAX(pps.planned_end_date) AS max_end,
      MAX(pps.planned_end_date) - MIN(pps.planned_start_date) AS total_duration
    FROM public.program_plan_subjects pps
    WHERE pps.program_plan_id = v_program_plan_id
  )
  INSERT INTO public.application_learning_subjects (
    application_id, program_plan_subject_id, planned_start_date, planned_end_date, 
    is_catch_up, sequence_order
  )
  SELECT 
    app_id,
    pps.id,
    -- Adjust dates based on commencement date and cycle
    CASE 
      WHEN v_cycle_number = 0 THEN 
        -- Use proposed_commencement_date as anchor if it's after original start
        CASE 
          WHEN proposed_commencement_date > pps.planned_start_date 
          THEN proposed_commencement_date
          ELSE pps.planned_start_date
        END
      ELSE 
        -- For cycle > 0, shift dates by cycle * total_duration
        pps.planned_start_date + (sd.total_duration * v_cycle_number)
    END AS planned_start_date,
    CASE 
      WHEN v_cycle_number = 0 THEN pps.planned_end_date
      ELSE pps.planned_end_date + (sd.total_duration * v_cycle_number)
    END AS planned_end_date,
    FALSE, -- is_catch_up
    pps.sequence_order
  FROM public.program_plan_subjects pps
  CROSS JOIN subject_dates sd
  WHERE pps.program_plan_id = v_program_plan_id
  ORDER BY pps.sequence_order;

  -- Insert classes per ALS row within planned window
  -- NOW WITH GROUP_ID AND LOCATION_ID FILTERS
  WITH als AS (
    SELECT * FROM public.application_learning_subjects WHERE application_id = app_id
  ),
  joined AS (
    SELECT als.id AS als_id, als.application_id, ppc.*
    FROM als
    JOIN public.program_plan_classes ppc ON ppc.program_plan_subject_id = als.program_plan_subject_id
    WHERE ppc.class_date BETWEEN als.planned_start_date AND als.planned_end_date
      -- CRITICAL FIX: Filter by group_id from application
      AND ppc.group_id = (SELECT group_id FROM public.applications WHERE id = app_id)
      -- ADDITIONAL SAFETY: Filter by location_id from application
      AND ppc.location_id = (SELECT preferred_location_id FROM public.applications WHERE id = app_id)
  )
  INSERT INTO public.application_learning_classes (
    application_id, application_learning_subject_id, program_plan_class_id,
    class_date, start_time, end_time, trainer_id, location_id, classroom_id, class_type
  )
  SELECT j.application_id, j.als_id, j.id,
         j.class_date::date, j.start_time::time, j.end_time::time,
         j.trainer_id, j.location_id, j.classroom_id, j.class_type::text
  FROM joined j;

  -- Set output counts
  SELECT COUNT(*) INTO v_subjects FROM public.application_learning_subjects WHERE application_id = app_id;
  SELECT COUNT(*) INTO v_classes FROM public.application_learning_classes WHERE application_id = app_id;

  RETURN QUERY SELECT v_subjects, v_classes;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.upsert_enrollment_plan IS 'Freezes learning plan for an application, filtering classes by group_id and location_id to ensure students only see their assigned group classes';

COMMIT;

