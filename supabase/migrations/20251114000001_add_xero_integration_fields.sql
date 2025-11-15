BEGIN;

-- Add Xero Contact ID to students table
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS xero_contact_id text;

COMMENT ON COLUMN public.students.xero_contact_id IS 'Stores the Xero Contact UUID returned when creating/updating a contact. Used for all future invoice/payment operations for this student.';

-- Add Xero sync fields to invoices table
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS xero_invoice_id text,
  ADD COLUMN IF NOT EXISTS xero_sync_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS xero_sync_error text,
  ADD COLUMN IF NOT EXISTS xero_synced_at timestamptz;

COMMENT ON COLUMN public.invoices.xero_invoice_id IS 'Xero InvoiceID (UUID format) returned when invoice is created in Xero.';
COMMENT ON COLUMN public.invoices.xero_sync_status IS 'Sync status: pending, synced, failed, or skipped.';
COMMENT ON COLUMN public.invoices.xero_sync_error IS 'Error message if sync to Xero fails.';
COMMENT ON COLUMN public.invoices.xero_synced_at IS 'Timestamp when invoice was successfully synced to Xero.';

-- Add constraint to ensure valid sync status values
ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_xero_sync_status_check
  CHECK (xero_sync_status IS NULL OR xero_sync_status IN ('pending', 'synced', 'failed', 'skipped'));

-- Add Xero sync fields to payments table
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS xero_payment_id text,
  ADD COLUMN IF NOT EXISTS xero_sync_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS xero_sync_error text,
  ADD COLUMN IF NOT EXISTS xero_synced_at timestamptz;

COMMENT ON COLUMN public.payments.xero_payment_id IS 'Xero PaymentID returned when payment is recorded in Xero.';
COMMENT ON COLUMN public.payments.xero_sync_status IS 'Sync status: pending, synced, failed, or skipped.';
COMMENT ON COLUMN public.payments.xero_sync_error IS 'Error message if sync to Xero fails.';
COMMENT ON COLUMN public.payments.xero_synced_at IS 'Timestamp when payment was successfully synced to Xero.';

-- Add constraint to ensure valid sync status values
ALTER TABLE public.payments
  ADD CONSTRAINT payments_xero_sync_status_check
  CHECK (xero_sync_status IS NULL OR xero_sync_status IN ('pending', 'synced', 'failed', 'skipped'));

-- Add Xero accounting mapping fields to payment_plan_templates table
ALTER TABLE public.payment_plan_templates
  ADD COLUMN IF NOT EXISTS xero_account_code text DEFAULT '200',
  ADD COLUMN IF NOT EXISTS xero_tax_type text DEFAULT 'OUTPUT2',
  ADD COLUMN IF NOT EXISTS xero_item_code text;

COMMENT ON COLUMN public.payment_plan_templates.xero_account_code IS 'Chart of Accounts code for Xero (e.g., 200 = Course Fee Income). Defaults to 200.';
COMMENT ON COLUMN public.payment_plan_templates.xero_tax_type IS 'Australian GST tax type code for Xero (e.g., OUTPUT2 for GST on Income, EXEMPTOUTPUT for GST-free). Defaults to OUTPUT2.';
COMMENT ON COLUMN public.payment_plan_templates.xero_item_code IS 'Optional mapping to Xero Items/Products.';

-- Add Xero OAuth credentials and configuration to rtos table
ALTER TABLE public.rtos
  ADD COLUMN IF NOT EXISTS xero_tenant_id text,
  ADD COLUMN IF NOT EXISTS xero_access_token_encrypted text,
  ADD COLUMN IF NOT EXISTS xero_refresh_token_encrypted text,
  ADD COLUMN IF NOT EXISTS xero_token_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS xero_default_payment_account_code text,
  ADD COLUMN IF NOT EXISTS xero_webhook_key text;

COMMENT ON COLUMN public.rtos.xero_tenant_id IS 'The Xero organization ID (tenant ID) required for all API calls.';
COMMENT ON COLUMN public.rtos.xero_access_token_encrypted IS 'Encrypted OAuth 2.0 access token for Xero API access. Tokens expire after 30 minutes.';
COMMENT ON COLUMN public.rtos.xero_refresh_token_encrypted IS 'Encrypted OAuth 2.0 refresh token for obtaining new access tokens. Refresh tokens expire after 60 days of inactivity.';
COMMENT ON COLUMN public.rtos.xero_token_expires_at IS 'Timestamp when the current access token expires. Used to determine when to refresh tokens.';
COMMENT ON COLUMN public.rtos.xero_default_payment_account_code IS 'Bank/un-deposited funds account code to use when recording payments in Xero (e.g., 101 for Un-deposited Funds).';
COMMENT ON COLUMN public.rtos.xero_webhook_key IS 'Webhook key for validating incoming webhook notifications from Xero (for future bidirectional sync).';

-- Create indexes for common Xero sync queries
CREATE INDEX IF NOT EXISTS idx_invoices_xero_sync_status ON public.invoices(xero_sync_status) WHERE xero_sync_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_xero_sync_status ON public.payments(xero_sync_status) WHERE xero_sync_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_students_xero_contact_id ON public.students(xero_contact_id) WHERE xero_contact_id IS NOT NULL;

COMMIT;

