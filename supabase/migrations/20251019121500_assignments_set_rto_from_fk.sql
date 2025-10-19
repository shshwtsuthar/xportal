-- Ensure rto_id derives from related FK rows to satisfy RLS regardless of JWT

BEGIN;

-- Set rto on subject_assignments from subjects
CREATE OR REPLACE FUNCTION public.subject_assignments_set_rto_from_subject()
RETURNS trigger AS $$
DECLARE v_rto uuid; BEGIN
  SELECT s.rto_id INTO v_rto FROM public.subjects s WHERE s.id = NEW.subject_id;
  IF v_rto IS NOT NULL THEN
    NEW.rto_id := v_rto;
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_subject_assignments_rto_from_subject ON public.subject_assignments;
CREATE TRIGGER trg_subject_assignments_rto_from_subject
BEFORE INSERT ON public.subject_assignments
FOR EACH ROW EXECUTE FUNCTION public.subject_assignments_set_rto_from_subject();

-- Set rto on student_assignment_submissions from students
CREATE OR REPLACE FUNCTION public.student_submissions_set_rto_from_student()
RETURNS trigger AS $$
DECLARE v_rto uuid; BEGIN
  SELECT st.rto_id INTO v_rto FROM public.students st WHERE st.id = NEW.student_id;
  IF v_rto IS NOT NULL THEN
    NEW.rto_id := v_rto;
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_submissions_rto_from_student ON public.student_assignment_submissions;
CREATE TRIGGER trg_submissions_rto_from_student
BEFORE INSERT ON public.student_assignment_submissions
FOR EACH ROW EXECUTE FUNCTION public.student_submissions_set_rto_from_student();

COMMIT;


