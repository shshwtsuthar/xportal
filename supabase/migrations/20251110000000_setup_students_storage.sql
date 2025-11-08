-- Setup private storage bucket for student documents and RLS policies

-- 1) Create private bucket `students` (no public access)
INSERT INTO storage.buckets (id, name, public)
VALUES ('students', 'students', false)
ON CONFLICT (id) DO NOTHING;

-- 2) RLS policies for storage.objects scoped to bucket 'students'
-- Users can only access files within a folder named after a student id

-- SELECT (view/download metadata and enable signed URLs)
CREATE POLICY "r-auth-select-student-files" ON storage.objects FOR SELECT
USING (
  bucket_id = 'students'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.students
    WHERE students.id = (storage.foldername(name))[1]::uuid
  )
);

-- INSERT (upload)
CREATE POLICY "r-auth-insert-student-files" ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'students'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.students
    WHERE students.id = (storage.foldername(name))[1]::uuid
  )
);

-- DELETE (remove)
CREATE POLICY "r-auth-delete-student-files" ON storage.objects FOR DELETE
USING (
  bucket_id = 'students'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.students
    WHERE students.id = (storage.foldername(name))[1]::uuid
  )
);

