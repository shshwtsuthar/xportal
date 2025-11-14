BEGIN;

-- Update record_payment function to return the payment_id
-- This allows the caller to know which payment was created for commission calculation
-- Note: We must DROP and recreate because PostgreSQL doesn't allow changing return type with CREATE OR REPLACE

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
  v_payment_id uuid;
BEGIN
  SELECT rto_id INTO v_rto_id FROM public.invoices WHERE id = p_invoice_id;
  IF v_rto_id IS NULL THEN
    RAISE EXCEPTION 'Invoice not found';
  END IF;

  INSERT INTO public.payments (invoice_id, rto_id, payment_date, amount_cents, reconciliation_notes)
  VALUES (p_invoice_id, v_rto_id, p_payment_date, p_amount_cents, p_notes)
  RETURNING id INTO v_payment_id;

  UPDATE public.invoices
  SET amount_paid_cents = amount_paid_cents + p_amount_cents,
      status = CASE WHEN amount_paid_cents + p_amount_cents >= amount_due_cents THEN 'PAID' ELSE status END
  WHERE id = p_invoice_id;

  RETURN v_payment_id;
END;
$$;

COMMENT ON FUNCTION public.record_payment IS 'Records a payment against an invoice and returns the payment_id. Updated to return payment_id for commission calculation triggers.';

COMMIT;

