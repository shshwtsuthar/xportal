-- Setup private storage bucket for agent documents and RLS policies

-- 1) Create private bucket `agents` (no public access)
INSERT INTO storage.buckets (id, name, public)
VALUES ('agents', 'agents', false)
ON CONFLICT (id) DO NOTHING;

-- 2) RLS policies for storage.objects scoped to bucket 'agents'
-- Users can only access files within a folder named after an agent id

-- SELECT (view/download metadata and enable signed URLs)
CREATE POLICY "r-auth-select-agent-files" ON storage.objects FOR SELECT
USING (
  bucket_id = 'agents'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.agents
    WHERE agents.id = (storage.foldername(objects.name))[1]::uuid
  )
);

-- INSERT (upload)
CREATE POLICY "r-auth-insert-agent-files" ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'agents'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.agents
    WHERE agents.id = (storage.foldername(objects.name))[1]::uuid
  )
);

-- DELETE (remove)
CREATE POLICY "r-auth-delete-agent-files" ON storage.objects FOR DELETE
USING (
  bucket_id = 'agents'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.agents
    WHERE agents.id = (storage.foldername(objects.name))[1]::uuid
  )
);
