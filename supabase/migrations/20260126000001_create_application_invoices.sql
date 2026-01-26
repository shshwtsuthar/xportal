BEGIN;

-- Create application_invoices table
CREATE TABLE IF NOT EXISTS public.application_invoices (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  rto_id uuid NOT NULL REFERENCES public.rtos(id) ON DELETE CASCADE,
  
  -- Invoice identification
  invoice_number text NOT NULL UNIQUE,
  status public.invoice_status NOT NULL DEFAULT 'SCHEDULED',
  
  -- Dates
  issue_date date NOT NULL,
  due_date date NOT NULL,
  
  -- Amounts
  amount_due_cents int NOT NULL CHECK (amount_due_cents >= 0),
  amount_paid_cents int NOT NULL DEFAULT 0 CHECK (amount_paid_cents >= 0),
  
  -- Internal payment tracking
  internal_payment_status public.internal_payment_status NOT NULL DEFAULT 'UNPAID',
  
  -- PDF and email
  pdf_path text,
  pdf_generation_status invoice_pdf_generation_status NOT NULL DEFAULT 'pending',
  pdf_generation_attempts integer NOT NULL DEFAULT 0,
  last_pdf_error text,
  pdf_generated_at timestamptz,
  last_email_sent_at timestamptz,
  
  -- Overdue tracking
  first_overdue_at timestamptz,
  last_overdue_at timestamptz,
  
  -- Notes
  notes text,
  
  -- Xero sync fields (for future use, but application invoices should not sync)
  xero_invoice_id text,
  xero_sync_status text DEFAULT 'skipped',
  xero_sync_error text,
  xero_synced_at timestamptz,
  
  -- Migration tracking
  migrated_to_enrollment boolean NOT NULL DEFAULT false,
  
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT application_invoices_status_check 
    CHECK (status IN ('SCHEDULED', 'VOID')),
  CONSTRAINT application_invoices_xero_sync_status_check
    CHECK (xero_sync_status IS NULL OR xero_sync_status IN ('pending', 'synced', 'failed', 'skipped'))
);

COMMENT ON TABLE public.application_invoices IS 'Invoices created at offer send for deposits. Cannot be SENT until approval.';
COMMENT ON COLUMN public.application_invoices.status IS 'Application invoices can only be SCHEDULED or VOID. Cannot be SENT until migrated to enrollment.';
COMMENT ON COLUMN public.application_invoices.migrated_to_enrollment IS 'True when this invoice has been copied to enrollment_invoices during approval.';
COMMENT ON COLUMN public.application_invoices.xero_sync_status IS 'Application invoices should always be skipped for Xero sync.';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_application_invoices_application_id 
  ON public.application_invoices(application_id);
CREATE INDEX IF NOT EXISTS idx_application_invoices_rto_id 
  ON public.application_invoices(rto_id);
CREATE INDEX IF NOT EXISTS idx_application_invoices_invoice_number 
  ON public.application_invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_application_invoices_status 
  ON public.application_invoices(status);
CREATE INDEX IF NOT EXISTS idx_application_invoices_migrated 
  ON public.application_invoices(migrated_to_enrollment);

-- Create application_invoice_lines table
CREATE TABLE IF NOT EXISTS public.application_invoice_lines (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  application_invoice_id uuid NOT NULL REFERENCES public.application_invoices(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  amount_cents int NOT NULL CHECK (amount_cents >= 0),
  sequence_order int NOT NULL DEFAULT 0,
  is_commissionable boolean NOT NULL DEFAULT false,
  xero_account_code text,
  xero_tax_type text,
  xero_item_code text
);

COMMENT ON TABLE public.application_invoice_lines IS 'Line items for application invoices. Copied to enrollment_invoice_lines during approval.';

-- Create indexes for application_invoice_lines
CREATE INDEX IF NOT EXISTS idx_application_invoice_lines_invoice_id
  ON public.application_invoice_lines(application_invoice_id);

-- Enable RLS
ALTER TABLE public.application_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_invoice_lines ENABLE ROW LEVEL SECURITY;

-- RLS policies for application_invoices
DO $$ BEGIN
  CREATE POLICY application_invoices_tenant_rw ON public.application_invoices
  USING (
    EXISTS (
      SELECT 1 FROM public.applications a
      WHERE a.id = application_id
        AND a.rto_id = public.get_my_rto_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.applications a
      WHERE a.id = application_id
        AND a.rto_id = public.get_my_rto_id()
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- RLS policies for application_invoice_lines
DO $$ BEGIN
  CREATE POLICY application_invoice_lines_tenant_rw ON public.application_invoice_lines
  USING (
    EXISTS (
      SELECT 1 
      FROM public.application_invoices ai
      JOIN public.applications a ON a.id = ai.application_id
      WHERE ai.id = application_invoice_id
        AND a.rto_id = public.get_my_rto_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM public.application_invoices ai
      JOIN public.applications a ON a.id = ai.application_id
      WHERE ai.id = application_invoice_id
        AND a.rto_id = public.get_my_rto_id()
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMIT;
