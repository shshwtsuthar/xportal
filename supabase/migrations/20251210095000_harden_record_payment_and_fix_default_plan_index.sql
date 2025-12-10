BEGIN;

-- Harden record_payment: tenant guard, positive amounts, status upkeep.
DROP FUNCTION IF EXISTS public.record_payment(uuid, date, int, text);

CREATE FUNCTION public.record_payment(
  p_invoice_id uuid,
  p_payment_date date,
  p_amount_cents int,
  p_notes text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_rto_id uuid;
  v_my_rto uuid;
  v_payment_id uuid;
  v_new_paid int;
BEGIN
  IF p_amount_cents IS NULL OR p_amount_cents <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be greater than zero';
  END IF;

  SELECT rto_id, amount_paid_cents + p_amount_cents
  INTO v_rto_id, v_new_paid
  FROM public.invoices
  WHERE id = p_invoice_id;

  IF v_rto_id IS NULL THEN
    RAISE EXCEPTION 'Invoice not found';
  END IF;

  -- Tenant guard: caller must match invoice RTO
  SELECT public.get_my_rto_id() INTO v_my_rto;
  IF v_my_rto IS NULL OR v_my_rto <> v_rto_id THEN
    RAISE EXCEPTION 'Unauthorized to record payment for this invoice';
  END IF;

  INSERT INTO public.payments (invoice_id, rto_id, payment_date, amount_cents, reconciliation_notes)
  VALUES (p_invoice_id, v_rto_id, p_payment_date, p_amount_cents, p_notes)
  RETURNING id INTO v_payment_id;

  UPDATE public.invoices
  SET amount_paid_cents = amount_paid_cents + p_amount_cents,
      internal_payment_status = CASE
        WHEN v_new_paid <= 0 THEN 'UNPAID'::public.internal_payment_status
        WHEN v_new_paid < amount_due_cents THEN 'PARTIALLY_PAID'::public.internal_payment_status
        ELSE 'PAID_INTERNAL'::public.internal_payment_status
      END,
      status = CASE
        WHEN v_new_paid >= amount_due_cents THEN 'PAID'
        ELSE status
      END
  WHERE id = p_invoice_id;

  RETURN v_payment_id;
END;
$$;

COMMENT ON FUNCTION public.record_payment IS 'Records a payment against an invoice with tenant enforcement, positive-amount check, status sync, and returns payment_id.';

-- Fix default plan uniqueness: use program_id (qualification renamed)
DO $$ BEGIN
  DROP INDEX IF EXISTS uq_default_plan_per_program;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_default_plan_per_program
ON public.payment_plan_templates (rto_id, program_id)
WHERE is_default = true;

COMMIT;
