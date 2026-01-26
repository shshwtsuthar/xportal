BEGIN;

-- Update median date eligibility rule to include subjects where median_date equals commencement date
-- Previously: median_date > commencementDate (strictly greater)
-- Now: median_date >= commencementDate (greater than or equal)

-- Update the freeze_application_learning_plan function
CREATE OR REPLACE FUNCTION public.freeze_application_learning_plan(app_id uuid)
RETURNS TABLE(inserted_subjects int, inserted_classes int) AS $$
DECLARE
  v_app RECORD;
  v_commence date;
  v_timetable uuid;
  v_subjects int := 0;
  v_classes int := 0;
BEGIN
  -- Load application and preconditions
  SELECT * INTO v_app FROM public.applications WHERE id = app_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Application % not found', app_id; END IF;
  IF v_app.status::text <> 'DRAFT' THEN RAISE EXCEPTION 'Application % must be DRAFT to freeze', app_id; END IF;
  IF v_app.timetable_id IS NULL THEN RAISE EXCEPTION 'Application % missing timetable_id', app_id; END IF;
  IF v_app.proposed_commencement_date IS NULL THEN RAISE EXCEPTION 'Application % missing proposed_commencement_date', app_id; END IF;

  v_commence := v_app.proposed_commencement_date::date;
  v_timetable := v_app.timetable_id::uuid;

  -- Begin transactional writes (idempotent)
  DELETE FROM public.application_learning_classes WHERE application_id = app_id;
  DELETE FROM public.application_learning_subjects WHERE application_id = app_id;

  -- Common CTEs for all three insertions
  WITH plans AS (
    SELECT pp.*
    FROM public.timetable_program_plans tpp
    JOIN public.program_plans pp ON pp.id = tpp.program_plan_id
    WHERE tpp.timetable_id = v_timetable
  ),
  pps AS (
    SELECT pps.*
    FROM public.program_plan_subjects pps
    JOIN plans p ON p.id = pps.program_plan_id
  ),
  plan_bounds AS (
    SELECT p.id AS plan_id,
           MIN(pps.start_date) AS plan_start,
           MAX(pps.end_date) AS plan_end
    FROM plans p
    JOIN pps ON pps.program_plan_id = p.id
    GROUP BY p.id
  ),
  sorted_plans AS (
    SELECT p.id AS plan_id
    FROM plans p
    JOIN pps ON pps.program_plan_id = p.id
    GROUP BY p.id
    ORDER BY MIN(pps.start_date)
  ),
  chosen_plan AS (
    SELECT sp.plan_id
    FROM sorted_plans sp
    JOIN plan_bounds b ON b.plan_id = sp.plan_id
    WHERE v_commence BETWEEN b.plan_start AND b.plan_end
    UNION ALL
    SELECT sp.plan_id
    FROM sorted_plans sp
    JOIN plan_bounds b ON b.plan_id = sp.plan_id
    WHERE v_commence < b.plan_start
    ORDER BY 1
    LIMIT 1
  ),
  current_plan AS (
    SELECT COALESCE((SELECT plan_id FROM chosen_plan LIMIT 1), (SELECT plan_id FROM sorted_plans LIMIT 1)) AS plan_id
  ),
  current_subjects AS (
    SELECT *
    FROM pps
    WHERE program_plan_id = (SELECT plan_id FROM current_plan)
    ORDER BY start_date, COALESCE(sequence_order, 0)
  ),
  first_eligible AS (
    SELECT cs.*
    FROM current_subjects cs
    WHERE cs.median_date >= v_commence
    ORDER BY cs.start_date, COALESCE(cs.sequence_order, 0)
    LIMIT 1
  ),
  current_cycle AS (
    SELECT cs.*
    FROM current_subjects cs
    WHERE EXISTS (SELECT 1 FROM first_eligible fe WHERE true)
      AND cs.start_date >= (SELECT fe.start_date FROM first_eligible fe)
  ),
  -- FIXED: Get distinct prerequisite subject_ids from ALL program plans
  prereq_subject_ids AS (
    SELECT DISTINCT subject_id FROM pps WHERE is_prerequisite = true
  ),
  first_sched AS (
    SELECT * FROM current_cycle ORDER BY start_date, COALESCE(sequence_order, 0) LIMIT 1
  ),
  -- FIXED: Select only ONE prerequisite record per subject_id (preferably from current plan)
  prerequisite_records AS (
    SELECT DISTINCT ON (pps.subject_id) 
           pps.*, 
           (SELECT start_date FROM first_sched) AS align_start, 
           (SELECT end_date FROM first_sched) AS align_end
    FROM pps
    WHERE pps.subject_id IN (SELECT subject_id FROM prereq_subject_ids)
    ORDER BY pps.subject_id, 
             CASE WHEN pps.program_plan_id = (SELECT plan_id FROM current_plan) THEN 0 ELSE 1 END,
             pps.start_date
  )
  INSERT INTO public.application_learning_subjects (
    application_id, program_plan_subject_id, subject_id,
    planned_start_date, planned_end_date, is_catch_up, is_prerequisite, sequence_order
  )
  SELECT app_id,
         pr.id,
         pr.subject_id,
         COALESCE(pr.align_start, pr.start_date),
         COALESCE(pr.align_end, pr.end_date),
         false,
         true,
         pr.sequence_order
  FROM prerequisite_records pr;

  -- Insert current cycle subjects EXCLUDING prerequisites (FIXED)
  WITH plans AS (
    SELECT pp.*
    FROM public.timetable_program_plans tpp
    JOIN public.program_plans pp ON pp.id = tpp.program_plan_id
    WHERE tpp.timetable_id = v_timetable
  ),
  pps AS (
    SELECT pps.*
    FROM public.program_plan_subjects pps
    JOIN plans p ON p.id = pps.program_plan_id
  ),
  plan_bounds AS (
    SELECT p.id AS plan_id,
           MIN(pps.start_date) AS plan_start,
           MAX(pps.end_date) AS plan_end
    FROM plans p
    JOIN pps ON pps.program_plan_id = p.id
    GROUP BY p.id
  ),
  sorted_plans AS (
    SELECT p.id AS plan_id
    FROM plans p
    JOIN pps ON pps.program_plan_id = p.id
    GROUP BY p.id
    ORDER BY MIN(pps.start_date)
  ),
  chosen_plan AS (
    SELECT sp.plan_id
    FROM sorted_plans sp
    JOIN plan_bounds b ON b.plan_id = sp.plan_id
    WHERE v_commence BETWEEN b.plan_start AND b.plan_end
    UNION ALL
    SELECT sp.plan_id
    FROM sorted_plans sp
    JOIN plan_bounds b ON b.plan_id = sp.plan_id
    WHERE v_commence < b.plan_start
    ORDER BY 1
    LIMIT 1
  ),
  current_plan AS (
    SELECT COALESCE((SELECT plan_id FROM chosen_plan LIMIT 1), (SELECT plan_id FROM sorted_plans LIMIT 1)) AS plan_id
  ),
  current_subjects AS (
    SELECT *
    FROM pps
    WHERE program_plan_id = (SELECT plan_id FROM current_plan)
    ORDER BY start_date, COALESCE(sequence_order, 0)
  ),
  first_eligible AS (
    SELECT cs.*
    FROM current_subjects cs
    WHERE cs.median_date >= v_commence
    ORDER BY cs.start_date, COALESCE(cs.sequence_order, 0)
    LIMIT 1
  ),
  current_cycle AS (
    SELECT cs.*
    FROM current_subjects cs
    WHERE EXISTS (SELECT 1 FROM first_eligible fe WHERE true)
      AND cs.start_date >= (SELECT fe.start_date FROM first_eligible fe)
  ),
  -- FIXED: Use the same prereq_subject_ids scope
  prereq_subject_ids AS (
    SELECT DISTINCT subject_id FROM pps WHERE is_prerequisite = true
  ),
  cur AS (
    SELECT * FROM current_cycle 
    WHERE subject_id NOT IN (SELECT subject_id FROM prereq_subject_ids)
  )
  INSERT INTO public.application_learning_subjects (
    application_id, program_plan_subject_id, subject_id,
    planned_start_date, planned_end_date, is_catch_up, is_prerequisite, sequence_order
  )
  SELECT app_id, c.id, c.subject_id, c.start_date, c.end_date, false, false, c.sequence_order
  FROM cur c;

  -- Insert catch-up subjects EXCLUDING prerequisites (FIXED)
  WITH plans AS (
    SELECT pp.*
    FROM public.timetable_program_plans tpp
    JOIN public.program_plans pp ON pp.id = tpp.program_plan_id
    WHERE tpp.timetable_id = v_timetable
  ),
  pps AS (
    SELECT pps.*
    FROM public.program_plan_subjects pps
    JOIN plans p ON p.id = pps.program_plan_id
  ),
  plan_bounds AS (
    SELECT p.id AS plan_id,
           MIN(pps.start_date) AS plan_start,
           MAX(pps.end_date) AS plan_end
    FROM plans p
    JOIN pps ON pps.program_plan_id = p.id
    GROUP BY p.id
  ),
  sorted_plans AS (
    SELECT p.id AS plan_id
    FROM plans p
    JOIN pps ON pps.program_plan_id = p.id
    GROUP BY p.id
    ORDER BY MIN(pps.start_date)
  ),
  chosen_plan AS (
    SELECT sp.plan_id
    FROM sorted_plans sp
    JOIN plan_bounds b ON b.plan_id = sp.plan_id
    WHERE v_commence BETWEEN b.plan_start AND b.plan_end
    UNION ALL
    SELECT sp.plan_id
    FROM sorted_plans sp
    JOIN plan_bounds b ON b.plan_id = sp.plan_id
    WHERE v_commence < b.plan_start
    ORDER BY 1
    LIMIT 1
  ),
  current_plan AS (
    SELECT COALESCE((SELECT plan_id FROM chosen_plan LIMIT 1), (SELECT plan_id FROM sorted_plans LIMIT 1)) AS plan_id
  ),
  current_subjects AS (
    SELECT *
    FROM pps
    WHERE program_plan_id = (SELECT plan_id FROM current_plan)
  ),
  missed_seq AS (
    SELECT COALESCE(sequence_order, 0) AS sequence_order
    FROM current_subjects
    WHERE median_date < v_commence
  ),
  next_plan AS (
    SELECT sp.plan_id
    FROM sorted_plans sp
    WHERE sp.plan_id > (SELECT plan_id FROM current_plan)
    ORDER BY sp.plan_id
    LIMIT 1
  ),
  next_plan_subjects AS (
    SELECT * FROM pps WHERE program_plan_id = (SELECT plan_id FROM next_plan)
  ),
  -- FIXED: Use the same prereq_subject_ids scope
  prereq_subject_ids AS (
    SELECT DISTINCT subject_id FROM pps WHERE is_prerequisite = true
  ),
  cu AS (
    SELECT nps.*
    FROM next_plan_subjects nps
    WHERE COALESCE(nps.sequence_order, 0) IN (SELECT sequence_order FROM missed_seq)
      AND nps.subject_id NOT IN (SELECT subject_id FROM prereq_subject_ids)
  )
  INSERT INTO public.application_learning_subjects (
    application_id, program_plan_subject_id, subject_id,
    planned_start_date, planned_end_date, is_catch_up, is_prerequisite, sequence_order
  )
  SELECT app_id, cu.id, cu.subject_id, cu.start_date, cu.end_date, true, false, cu.sequence_order
  FROM cu;

  -- Insert classes per ALS row within planned window
  WITH als AS (
    SELECT * FROM public.application_learning_subjects WHERE application_id = app_id
  ),
  joined AS (
    SELECT als.id AS als_id, als.application_id, ppc.*
    FROM als
    JOIN public.program_plan_classes ppc ON ppc.program_plan_subject_id = als.program_plan_subject_id
    WHERE ppc.class_date BETWEEN als.planned_start_date AND als.planned_end_date
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

COMMIT;
