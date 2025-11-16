-- Add profile image support for user profiles
-- Files are stored under the path pattern: {user_id}/profile/{filename}

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS profile_image_path text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('user-profiles', 'user-profiles', false)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  CREATE POLICY "user-profiles-select" ON storage.objects FOR SELECT
  USING (
    bucket_id = 'user-profiles'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1]::uuid = auth.uid()
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "user-profiles-insert" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'user-profiles'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1]::uuid = auth.uid()
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "user-profiles-delete" ON storage.objects FOR DELETE
  USING (
    bucket_id = 'user-profiles'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1]::uuid = auth.uid()
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

