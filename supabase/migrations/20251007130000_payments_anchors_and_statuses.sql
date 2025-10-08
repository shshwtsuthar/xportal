BEGIN;

-- 1) Anchors: template-level anchor type for due date calculations
DO $$ BEGIN
  CREATE TYPE public.payment_plan_anchor_type AS ENUM (
    'COMMENCEMENT_DATE',
    'OFFER_DATE',
    'CUSTOM_DATE'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.payment_plan_templates
  ADD COLUMN IF NOT EXISTS anchor_type public.payment_plan_anchor_type NOT NULL DEFAULT 'COMMENCEMENT_DATE';

COMMENT ON COLUMN public.payment_plan_templates.anchor_type IS 'Defines which date the installment due_date_rule_days are calculated from.';

-- One default plan per (rto_id, program_id)
CREATE UNIQUE INDEX IF NOT EXISTS uq_default_plan_per_program
ON public.payment_plan_templates (rto_id, program_id)
WHERE is_default = true;

-- 2) Applications persist chosen template and possible custom anchor
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS payment_plan_template_id uuid REFERENCES public.payment_plan_templates(id),
  ADD COLUMN IF NOT EXISTS payment_anchor_date date,
  ADD COLUMN IF NOT EXISTS offer_generated_at timestamptz;

-- 3) Enrollments store the applied template id (copied from application on approval)
ALTER TABLE public.enrollments
  ADD COLUMN IF NOT EXISTS payment_plan_template_id uuid REFERENCES public.payment_plan_templates(id);

-- 4) Invoice status lifecycle: add SCHEDULED and make it default; stop using DRAFT
DO $$ BEGIN
  ALTER TYPE public.invoice_status ADD VALUE 'SCHEDULED';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 5) Atomic payment recording (RPC)
CREATE OR REPLACE FUNCTION public.record_payment(
  p_invoice_id uuid,
  p_payment_date date,
  p_amount_cents int,
  p_notes text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_rto_id uuid;
BEGIN
  SELECT rto_id INTO v_rto_id FROM public.invoices WHERE id = p_invoice_id;
  IF v_rto_id IS NULL THEN
    RAISE EXCEPTION 'Invoice not found';
  END IF;

  INSERT INTO public.payments (invoice_id, rto_id, payment_date, amount_cents, reconciliation_notes)
  VALUES (p_invoice_id, v_rto_id, p_payment_date, p_amount_cents, p_notes);

  UPDATE public.invoices
  SET amount_paid_cents = amount_paid_cents + p_amount_cents,
      status = CASE WHEN amount_paid_cents + p_amount_cents >= amount_due_cents THEN 'PAID' ELSE status END
  WHERE id = p_invoice_id;
END;
$$;

-- 6) Scheduler helper: promote SCHEDULED → SENT for upcoming invoices (7 days window)
CREATE OR REPLACE FUNCTION public.promote_scheduled_invoices()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.invoices
  SET status = 'SENT',
      issue_date = GREATEST(issue_date, CURRENT_DATE)
  WHERE status = 'SCHEDULED'
    AND due_date <= CURRENT_DATE + INTERVAL '7 days';
END;
$$;

COMMIT;


