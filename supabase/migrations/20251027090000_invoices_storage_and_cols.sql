BEGIN;

-- 1) Extend invoices with PDF storage path, email timestamp, internal notes
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS pdf_path text,
  ADD COLUMN IF NOT EXISTS last_email_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS notes text;

-- 2) Optional payment fields for future Stripe/Xero mapping
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS method text,
  ADD COLUMN IF NOT EXISTS external_ref text;

-- 3) Private storage bucket for invoice PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('invoices', 'invoices', false)
ON CONFLICT (id) DO NOTHING;

-- 4) RLS policies for storage.objects scoped to bucket 'invoices'
-- Path convention: invoices/{rtoId}/{year}/{invoiceNumber}.pdf
-- We allow authenticated users to SELECT only within their tenant. Writes are performed by service role.
DO $$ BEGIN
  CREATE POLICY "inv_select" ON storage.objects FOR SELECT
  USING (
    bucket_id = 'invoices'
    AND auth.role() = 'authenticated'
    AND (
      (storage.foldername(name))[1]::uuid = public.get_my_rto_id()
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- No INSERT/DELETE policies to keep writes restricted to service functions.

COMMIT;


