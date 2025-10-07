-- Setup private storage bucket for application documents and RLS policies

-- 1) Create private bucket `applications` (no public access)
INSERT INTO storage.buckets (id, name, public)
VALUES ('applications', 'applications', false)
ON CONFLICT (id) DO NOTHING;

-- 2) RLS policies for storage.objects scoped to bucket 'applications'
-- Users can only access files within a folder named after an application id

-- SELECT (view/download metadata and enable signed URLs)
CREATE POLICY "r-auth-select-app-files" ON storage.objects FOR SELECT
USING (
  bucket_id = 'applications'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.applications
    WHERE applications.id = (storage.foldername(name))[1]::uuid
  )
);

-- INSERT (upload)
CREATE POLICY "r-auth-insert-app-files" ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'applications'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.applications
    WHERE applications.id = (storage.foldername(name))[1]::uuid
  )
);

-- DELETE (remove)
CREATE POLICY "r-auth-delete-app-files" ON storage.objects FOR DELETE
USING (
  bucket_id = 'applications'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.applications
    WHERE applications.id = (storage.foldername(name))[1]::uuid
  )
);


