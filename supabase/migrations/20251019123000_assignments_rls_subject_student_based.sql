-- RLS: validate tenant via FK (subject_id/student_id) instead of NEW.rto_id

BEGIN;

-- subject_assignments: scope by subject's rto
DROP POLICY IF EXISTS subject_assignments_tenant_rw ON public.subject_assignments;
CREATE POLICY subject_assignments_rw ON public.subject_assignments
USING (
  EXISTS (
    SELECT 1 FROM public.subjects s
    WHERE s.id = subject_assignments.subject_id
      AND s.rto_id = public.get_my_effective_rto_id()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.subjects s
    WHERE s.id = subject_assignments.subject_id
      AND s.rto_id = public.get_my_effective_rto_id()
  )
);

-- student_assignment_submissions: scope by student's rto
DROP POLICY IF EXISTS submissions_tenant_rw ON public.student_assignment_submissions;
CREATE POLICY student_submissions_rw ON public.student_assignment_submissions
USING (
  EXISTS (
    SELECT 1 FROM public.students st
    WHERE st.id = student_assignment_submissions.student_id
      AND st.rto_id = public.get_my_effective_rto_id()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.students st
    WHERE st.id = student_assignment_submissions.student_id
      AND st.rto_id = public.get_my_effective_rto_id()
  )
);

COMMIT;


