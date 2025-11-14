BEGIN;

-- Commission invoice numbering sequence table
CREATE TABLE IF NOT EXISTS public.commission_invoice_sequences (
  rto_id uuid NOT NULL REFERENCES public.rtos(id) ON DELETE CASCADE,
  year integer NOT NULL,
  next_val bigint NOT NULL DEFAULT 1,
  PRIMARY KEY (rto_id, year)
);

COMMENT ON TABLE public.commission_invoice_sequences IS 'Tracks sequential invoice numbers for commission invoices per RTO per year.';

-- Function to generate commission invoice numbers
CREATE OR REPLACE FUNCTION public.generate_commission_invoice_number(p_rto_id uuid)
RETURNS text AS $$
DECLARE
  v_year int := EXTRACT(YEAR FROM CURRENT_DATE);
  v_seq bigint;
  v_number text;
BEGIN
  INSERT INTO public.commission_invoice_sequences (rto_id, year, next_val)
  VALUES (p_rto_id, v_year, 1)
  ON CONFLICT (rto_id, year) 
  DO UPDATE SET next_val = commission_invoice_sequences.next_val + 1
  RETURNING next_val INTO v_seq;

  v_number := 'COM-' || v_year || '-' || LPAD(v_seq::text, 6, '0');
  RETURN v_number;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.generate_commission_invoice_number IS 'Generates unique commission invoice numbers in format COM-YYYY-NNNNNN (e.g., COM-2025-000001).';

-- Commission invoices table
CREATE TABLE public.commission_invoices (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  rto_id uuid NOT NULL REFERENCES public.rtos(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE RESTRICT,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
  enrollment_id uuid NOT NULL REFERENCES public.enrollments(id) ON DELETE RESTRICT,
  student_payment_id uuid NOT NULL REFERENCES public.payments(id) ON DELETE RESTRICT,
  
  -- Commission calculation breakdown
  base_amount_cents integer NOT NULL CHECK (base_amount_cents >= 0),
  gst_amount_cents integer NOT NULL CHECK (gst_amount_cents >= 0),
  total_amount_cents integer NOT NULL CHECK (total_amount_cents >= 0),
  commission_rate_applied numeric(5,2) NOT NULL CHECK (commission_rate_applied >= 0 AND commission_rate_applied <= 100),
  
  -- Invoice metadata
  invoice_number text NOT NULL UNIQUE,
  issue_date date NOT NULL,
  due_date date NOT NULL,
  status text NOT NULL DEFAULT 'UNPAID' CHECK (status IN ('UNPAID', 'PAID', 'CANCELLED')),
  
  -- Payment tracking
  amount_paid_cents integer NOT NULL DEFAULT 0 CHECK (amount_paid_cents >= 0),
  paid_date date,
  payment_reference text,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Ensure one commission invoice per payment (idempotency)
  CONSTRAINT commission_invoices_unique_payment UNIQUE (student_payment_id)
);

COMMENT ON TABLE public.commission_invoices IS 'Tracks commission invoices generated when students make commissionable payments. Each invoice is linked to a specific student payment.';
COMMENT ON COLUMN public.commission_invoices.base_amount_cents IS 'Base commission amount (before GST) in cents.';
COMMENT ON COLUMN public.commission_invoices.gst_amount_cents IS 'GST amount (10% of base) in cents.';
COMMENT ON COLUMN public.commission_invoices.total_amount_cents IS 'Total commission amount (base + GST) in cents.';
COMMENT ON COLUMN public.commission_invoices.commission_rate_applied IS 'Snapshot of agent commission rate at time of calculation (for audit trail).';
COMMENT ON COLUMN public.commission_invoices.student_payment_id IS 'The payment that triggered this commission invoice. Ensures idempotency.';

-- Indexes for common queries
CREATE INDEX idx_commission_invoices_agent ON public.commission_invoices(agent_id);
CREATE INDEX idx_commission_invoices_student ON public.commission_invoices(student_id);
CREATE INDEX idx_commission_invoices_status ON public.commission_invoices(status);
CREATE INDEX idx_commission_invoices_payment ON public.commission_invoices(student_payment_id);
CREATE INDEX idx_commission_invoices_rto ON public.commission_invoices(rto_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_commission_invoices_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_commission_invoices_updated_at
BEFORE UPDATE ON public.commission_invoices
FOR EACH ROW
EXECUTE FUNCTION public.update_commission_invoices_updated_at();

-- Enable RLS
ALTER TABLE public.commission_invoices ENABLE ROW LEVEL SECURITY;

-- RLS policy: users can only see commission invoices for their RTO
CREATE POLICY "rls_commission_invoices_all" ON public.commission_invoices
FOR ALL
USING (rto_id = public.get_my_rto_id())
WITH CHECK (rto_id = public.get_my_rto_id());

COMMIT;

