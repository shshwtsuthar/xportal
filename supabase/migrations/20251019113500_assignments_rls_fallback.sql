-- Improve RLS: fallback to profiles.rto_id when app metadata rto_id is absent

BEGIN;

-- Helper function for effective rto_id
CREATE OR REPLACE FUNCTION public.get_my_effective_rto_id()
RETURNS uuid AS $$
DECLARE v_rto_id uuid; v_prof_rto uuid; BEGIN
  SELECT public.get_my_rto_id() INTO v_rto_id;
  IF v_rto_id IS NOT NULL THEN RETURN v_rto_id; END IF;
  SELECT p.rto_id INTO v_prof_rto FROM public.profiles p WHERE p.id = auth.uid();
  RETURN v_prof_rto;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

-- Replace subject_assignments policy
DROP POLICY IF EXISTS subject_assignments_tenant_rw ON public.subject_assignments;
CREATE POLICY subject_assignments_tenant_rw ON public.subject_assignments
USING (rto_id = public.get_my_effective_rto_id())
WITH CHECK (rto_id = public.get_my_effective_rto_id());

-- Replace student submissions policy
DROP POLICY IF EXISTS submissions_tenant_rw ON public.student_assignment_submissions;
CREATE POLICY submissions_tenant_rw ON public.student_assignment_submissions
USING (rto_id = public.get_my_effective_rto_id())
WITH CHECK (rto_id = public.get_my_effective_rto_id());

-- Update storage policies to use effective rto id
-- subject-assignments
DROP POLICY IF EXISTS "sa_select" ON storage.objects;
CREATE POLICY "sa_select" ON storage.objects FOR SELECT
USING (
  bucket_id = 'subject-assignments'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.subjects s
    WHERE s.id = (storage.foldername(name))[2]::uuid
      AND s.rto_id = public.get_my_effective_rto_id()
  )
);

DROP POLICY IF EXISTS "sa_insert" ON storage.objects;
CREATE POLICY "sa_insert" ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'subject-assignments'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.subjects s
    WHERE s.id = (storage.foldername(name))[2]::uuid
      AND s.rto_id = public.get_my_effective_rto_id()
  )
);

DROP POLICY IF EXISTS "sa_delete" ON storage.objects;
CREATE POLICY "sa_delete" ON storage.objects FOR DELETE
USING (
  bucket_id = 'subject-assignments'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.subjects s
    WHERE s.id = (storage.foldername(name))[2]::uuid
      AND s.rto_id = public.get_my_effective_rto_id()
  )
);

-- student-submissions
DROP POLICY IF EXISTS "ss_select" ON storage.objects;
CREATE POLICY "ss_select" ON storage.objects FOR SELECT
USING (
  bucket_id = 'student-submissions'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.students st
    WHERE st.id = (storage.foldername(name))[2]::uuid
      AND st.rto_id = public.get_my_effective_rto_id()
  )
);

DROP POLICY IF EXISTS "ss_insert" ON storage.objects;
CREATE POLICY "ss_insert" ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'student-submissions'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.students st
    WHERE st.id = (storage.foldername(name))[2]::uuid
      AND st.rto_id = public.get_my_effective_rto_id()
  )
);

DROP POLICY IF EXISTS "ss_delete" ON storage.objects;
CREATE POLICY "ss_delete" ON storage.objects FOR DELETE
USING (
  bucket_id = 'student-submissions'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.students st
    WHERE st.id = (storage.foldername(name))[2]::uuid
      AND st.rto_id = public.get_my_effective_rto_id()
  )
);

COMMIT;


