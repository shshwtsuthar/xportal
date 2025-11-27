BEGIN;

-- 1) Enum for internal payment tracking
DO $$ BEGIN
  CREATE TYPE public.internal_payment_status AS ENUM (
    'UNPAID',
    'PARTIALLY_PAID',
    'PAID_INTERNAL',
    'PAID_CONFIRMED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS internal_payment_status public.internal_payment_status NOT NULL DEFAULT 'UNPAID';

-- 2) Lines attached to payment plan installments
CREATE TABLE IF NOT EXISTS public.payment_plan_template_installment_lines (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  installment_id uuid NOT NULL REFERENCES public.payment_plan_template_installments(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  amount_cents int NOT NULL CHECK (amount_cents >= 0),
  sequence_order int NOT NULL DEFAULT 0,
  is_commissionable boolean NOT NULL DEFAULT false,
  xero_account_code text,
  xero_tax_type text,
  xero_item_code text
);

CREATE INDEX IF NOT EXISTS idx_template_lines_installment_id
  ON public.payment_plan_template_installment_lines (installment_id);

-- 3) Snapshot lines stored on invoices
CREATE TABLE IF NOT EXISTS public.invoice_lines (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  amount_cents int NOT NULL CHECK (amount_cents >= 0),
  sequence_order int NOT NULL DEFAULT 0,
  is_commissionable boolean NOT NULL DEFAULT false,
  xero_account_code text,
  xero_tax_type text,
  xero_item_code text
);

CREATE INDEX IF NOT EXISTS idx_invoice_lines_invoice_id
  ON public.invoice_lines (invoice_id);

COMMIT;




