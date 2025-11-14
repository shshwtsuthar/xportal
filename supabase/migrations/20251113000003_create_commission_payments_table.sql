BEGIN;

-- Commission payments table (tracks when RTO pays agents)
CREATE TABLE public.commission_payments (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  rto_id uuid NOT NULL REFERENCES public.rtos(id) ON DELETE CASCADE,
  commission_invoice_id uuid NOT NULL REFERENCES public.commission_invoices(id) ON DELETE RESTRICT,
  
  payment_date date NOT NULL,
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  payment_method text, -- 'Bank Transfer', 'EFT', 'Cheque', etc.
  reference text,
  notes text,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id)
);

COMMENT ON TABLE public.commission_payments IS 'Tracks payments made by the RTO to agents for commission invoices.';
COMMENT ON COLUMN public.commission_payments.commission_invoice_id IS 'The commission invoice this payment is for.';
COMMENT ON COLUMN public.commission_payments.created_by IS 'User who recorded this payment.';

-- Index for common queries
CREATE INDEX idx_commission_payments_invoice ON public.commission_payments(commission_invoice_id);
CREATE INDEX idx_commission_payments_rto ON public.commission_payments(rto_id);

-- Enable RLS
ALTER TABLE public.commission_payments ENABLE ROW LEVEL SECURITY;

-- RLS policy: users can only see commission payments for their RTO
CREATE POLICY "rls_commission_payments_all" ON public.commission_payments
FOR ALL
USING (rto_id = public.get_my_rto_id())
WITH CHECK (rto_id = public.get_my_rto_id());

COMMIT;

