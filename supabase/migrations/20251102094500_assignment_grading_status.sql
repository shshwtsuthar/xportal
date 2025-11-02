-- Assignment grading outcomes propagate to enrollment subjects

BEGIN;

CREATE OR REPLACE FUNCTION public.recalc_enrollment_subject_outcome()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_student_id uuid := COALESCE(NEW.student_id, OLD.student_id);
  v_subject_id uuid := COALESCE(NEW.subject_id, OLD.subject_id);
  v_enrollment_subject_id uuid;
  v_total_assignments integer;
  v_total_s integer;
  v_total_nys integer;
  v_new_outcome text;
BEGIN
  IF v_student_id IS NULL OR v_subject_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT es.id
  INTO v_enrollment_subject_id
  FROM public.enrollment_subjects es
  JOIN public.enrollments e ON e.id = es.enrollment_id
  JOIN public.program_plan_subjects pps ON pps.id = es.program_plan_subject_id
  WHERE e.student_id = v_student_id
    AND pps.subject_id = v_subject_id
  ORDER BY es.start_date NULLS FIRST, es.id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT COUNT(*)
  INTO v_total_assignments
  FROM public.subject_assignments sa
  WHERE sa.subject_id = v_subject_id;

  IF v_total_assignments = 0 THEN
    UPDATE public.enrollment_subjects es
    SET outcome_code = NULL
    WHERE es.id = v_enrollment_subject_id
      AND es.outcome_code IS DISTINCT FROM NULL;
    RETURN COALESCE(NEW, OLD);
  END IF;

  WITH latest AS (
    SELECT DISTINCT ON (sas.assignment_id)
      sas.assignment_id,
      sas.grade
    FROM public.student_assignment_submissions sas
    WHERE sas.student_id = v_student_id
      AND sas.subject_id = v_subject_id
    ORDER BY sas.assignment_id, sas.submitted_at DESC, sas.created_at DESC
  )
  SELECT
    COUNT(*) FILTER (WHERE latest.grade = 'S'),
    COUNT(*) FILTER (WHERE latest.grade = 'NYS')
  INTO v_total_s, v_total_nys
  FROM latest;

  IF v_total_assignments = v_total_s THEN
    v_new_outcome := 'C';
  ELSIF v_total_nys > 0 THEN
    v_new_outcome := 'NYC';
  ELSE
    v_new_outcome := NULL;
  END IF;

  UPDATE public.enrollment_subjects es
  SET outcome_code = v_new_outcome
  WHERE es.id = v_enrollment_subject_id
    AND es.outcome_code IS DISTINCT FROM v_new_outcome;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_student_assignment_submissions_outcome
  ON public.student_assignment_submissions;

CREATE TRIGGER trg_student_assignment_submissions_outcome
AFTER INSERT OR UPDATE OR DELETE ON public.student_assignment_submissions
FOR EACH ROW
EXECUTE FUNCTION public.recalc_enrollment_subject_outcome();

COMMIT;

