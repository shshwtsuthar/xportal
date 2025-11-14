-- Public storage bucket for WhatsApp media

-- 1) Create public bucket `whatsapp-media`
INSERT INTO storage.buckets (id, name, public)
VALUES ('whatsapp-media', 'whatsapp-media', true)
ON CONFLICT (id) DO NOTHING;

-- 2) RLS policies for storage.objects scoped to bucket 'whatsapp-media'
-- Public read
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'public-read-whatsapp-media'
  ) THEN
    CREATE POLICY "public-read-whatsapp-media" ON storage.objects FOR SELECT
    USING (bucket_id = 'whatsapp-media');
  END IF;
END$$;

-- Authenticated upload
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'auth-insert-whatsapp-media'
  ) THEN
    CREATE POLICY "auth-insert-whatsapp-media" ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'whatsapp-media' AND auth.role() = 'authenticated');
  END IF;
END$$;

-- Authenticated delete (optional)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'auth-delete-whatsapp-media'
  ) THEN
    CREATE POLICY "auth-delete-whatsapp-media" ON storage.objects FOR DELETE
    USING (bucket_id = 'whatsapp-media' AND auth.role() = 'authenticated');
  END IF;
END$$;




