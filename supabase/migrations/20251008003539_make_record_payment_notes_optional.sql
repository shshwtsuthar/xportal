-- Make p_notes parameter optional in record_payment RPC
CREATE OR REPLACE FUNCTION public.record_payment(
  p_invoice_id uuid,
  p_payment_date date,
  p_amount_cents int,
  p_notes text DEFAULT NULL
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
