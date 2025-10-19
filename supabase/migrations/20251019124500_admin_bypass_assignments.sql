-- Admin bypass for assignments/submissions and related storage policies

BEGIN;

-- Helper: is_admin() checks JWT app_metadata.role
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
AS $$
  SELECT COALESCE((auth.jwt() -> 'app_metadata' ->> 'role') = 'ADMIN', false);
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- subject_assignments policy: allow admin or same-tenant via subject
DROP POLICY IF EXISTS subject_assignments_rw ON public.subject_assignments;
CREATE POLICY subject_assignments_rw ON public.subject_assignments
USING (
  public.is_admin() OR EXISTS (
    SELECT 1 FROM public.subjects s
    WHERE s.id = subject_assignments.subject_id
      AND s.rto_id = public.get_my_effective_rto_id()
  )
)
WITH CHECK (
  public.is_admin() OR EXISTS (
    SELECT 1 FROM public.subjects s
    WHERE s.id = subject_assignments.subject_id
      AND s.rto_id = public.get_my_effective_rto_id()
  )
);

-- student_assignment_submissions policy: allow admin or same-tenant via student
DROP POLICY IF EXISTS student_submissions_rw ON public.student_assignment_submissions;
CREATE POLICY student_submissions_rw ON public.student_assignment_submissions
USING (
  public.is_admin() OR EXISTS (
    SELECT 1 FROM public.students st
    WHERE st.id = student_assignment_submissions.student_id
      AND st.rto_id = public.get_my_effective_rto_id()
  )
)
WITH CHECK (
  public.is_admin() OR EXISTS (
    SELECT 1 FROM public.students st
    WHERE st.id = student_assignment_submissions.student_id
      AND st.rto_id = public.get_my_effective_rto_id()
  )
);

-- Storage: subject-assignments (select/insert/delete)
DROP POLICY IF EXISTS "sa_select" ON storage.objects;
CREATE POLICY "sa_select" ON storage.objects FOR SELECT
USING (
  bucket_id = 'subject-assignments'
  AND auth.role() = 'authenticated'
  AND (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.subjects s
      WHERE s.id = (storage.foldername(name))[2]::uuid
    )
  )
);

DROP POLICY IF EXISTS "sa_insert" ON storage.objects;
CREATE POLICY "sa_insert" ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'subject-assignments'
  AND auth.role() = 'authenticated'
  AND (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.subjects s
      WHERE s.id = (storage.foldername(name))[2]::uuid
    )
  )
);

DROP POLICY IF EXISTS "sa_delete" ON storage.objects;
CREATE POLICY "sa_delete" ON storage.objects FOR DELETE
USING (
  bucket_id = 'subject-assignments'
  AND auth.role() = 'authenticated'
  AND (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.subjects s
      WHERE s.id = (storage.foldername(name))[2]::uuid
    )
  )
);

-- Storage: student-submissions (select/insert/delete)
DROP POLICY IF EXISTS "ss_select" ON storage.objects;
CREATE POLICY "ss_select" ON storage.objects FOR SELECT
USING (
  bucket_id = 'student-submissions'
  AND auth.role() = 'authenticated'
  AND (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.students st
      WHERE st.id = (storage.foldername(name))[2]::uuid
    )
  )
);

DROP POLICY IF EXISTS "ss_insert" ON storage.objects;
CREATE POLICY "ss_insert" ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'student-submissions'
  AND auth.role() = 'authenticated'
  AND (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.students st
      WHERE st.id = (storage.foldername(name))[2]::uuid
    )
  )
);

DROP POLICY IF EXISTS "ss_delete" ON storage.objects;
CREATE POLICY "ss_delete" ON storage.objects FOR DELETE
USING (
  bucket_id = 'student-submissions'
  AND auth.role() = 'authenticated'
  AND (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.students st
      WHERE st.id = (storage.foldername(name))[2]::uuid
    )
  )
);

COMMIT;


