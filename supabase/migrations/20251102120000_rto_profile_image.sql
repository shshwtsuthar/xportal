-- Add profile image support for RTOs
-- Files are stored under the path pattern: {rto_id}/profile/{filename}

ALTER TABLE public.rtos
ADD COLUMN IF NOT EXISTS profile_image_path text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('rto-assets', 'rto-assets', false)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  CREATE POLICY "rto-assets-select" ON storage.objects FOR SELECT
  USING (
    bucket_id = 'rto-assets'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1]::uuid = public.get_my_effective_rto_id()
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "rto-assets-insert" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'rto-assets'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1]::uuid = public.get_my_effective_rto_id()
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "rto-assets-delete" ON storage.objects FOR DELETE
  USING (
    bucket_id = 'rto-assets'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1]::uuid = public.get_my_effective_rto_id()
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

