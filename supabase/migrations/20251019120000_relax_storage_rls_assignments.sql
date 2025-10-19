-- Align storage RLS with New Application Wizard pattern: existence-only checks

BEGIN;

-- subject-assignments: subjects/{subjectId}/assignments/{assignmentId}/{fileName}
DROP POLICY IF EXISTS "sa_select" ON storage.objects;
CREATE POLICY "sa_select" ON storage.objects FOR SELECT
USING (
  bucket_id = 'subject-assignments'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.subjects s
    WHERE s.id = (storage.foldername(name))[2]::uuid
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
  )
);

-- student-submissions: students/{studentId}/submissions/{assignmentId}/{submissionId}/{fileName}
DROP POLICY IF EXISTS "ss_select" ON storage.objects;
CREATE POLICY "ss_select" ON storage.objects FOR SELECT
USING (
  bucket_id = 'student-submissions'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.students st
    WHERE st.id = (storage.foldername(name))[2]::uuid
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
  )
);

COMMIT;


