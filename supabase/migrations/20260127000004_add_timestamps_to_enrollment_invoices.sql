-- Add created_at and updated_at columns to enrollment_invoices table
-- These are needed by the migrate_application_invoices_to_enrollment function

ALTER TABLE public.enrollment_invoices
  ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now() NOT NULL,
  ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now() NOT NULL;

-- Create trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_enrollment_invoices_updated_at ON public.enrollment_invoices;
CREATE TRIGGER set_enrollment_invoices_updated_at
  BEFORE UPDATE ON public.enrollment_invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON COLUMN public.enrollment_invoices.created_at IS 'Timestamp when the invoice was created';
COMMENT ON COLUMN public.enrollment_invoices.updated_at IS 'Timestamp when the invoice was last updated (auto-updated by trigger)';
