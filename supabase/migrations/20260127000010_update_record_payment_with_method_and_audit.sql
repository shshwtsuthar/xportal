BEGIN;

-- Update record_payment to accept payment method and populate audit fields.
-- Existing callers that omit p_method continue to work because it has a default.

DROP FUNCTION IF EXISTS public.record_payment(public.invoice_type_enum, uuid, date, int, text);

CREATE FUNCTION public.record_payment(
  p_invoice_type public.invoice_type_enum,
  p_invoice_id uuid,
  p_payment_date date,
  p_amount_cents int,
  p_notes text DEFAULT NULL,
  p_method public.payment_method_enum DEFAULT 'OTHER'::public.payment_method_enum
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_rto_id uuid;
  v_my_rto uuid;
  v_payment_id uuid;
  v_new_paid int;
  v_amount_due_cents int;
BEGIN
  IF p_amount_cents IS NULL OR p_amount_cents <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be greater than zero';
  END IF;

  -- Validate invoice exists in correct table and get RTO
  IF p_invoice_type = 'APPLICATION' THEN
    SELECT rto_id, amount_paid_cents + p_amount_cents, amount_due_cents
    INTO v_rto_id, v_new_paid, v_amount_due_cents
    FROM public.application_invoices
    WHERE id = p_invoice_id;
  ELSIF p_invoice_type = 'ENROLLMENT' THEN
    SELECT rto_id, amount_paid_cents + p_amount_cents, amount_due_cents
    INTO v_rto_id, v_new_paid, v_amount_due_cents
    FROM public.enrollment_invoices
    WHERE id = p_invoice_id;
  ELSE
    RAISE EXCEPTION 'Invalid invoice_type: %', p_invoice_type;
  END IF;

  IF v_rto_id IS NULL THEN
    RAISE EXCEPTION 'Invoice not found in % table', p_invoice_type;
  END IF;

  -- Tenant guard: caller must match invoice RTO
  SELECT public.get_my_rto_id() INTO v_my_rto;
  IF v_my_rto IS NULL OR v_my_rto <> v_rto_id THEN
    RAISE EXCEPTION 'Unauthorized to record payment for this invoice';
  END IF;

  -- Insert payment with invoice_type, method, and audit fields
  INSERT INTO public.payments (
    invoice_id,
    invoice_type,
    rto_id,
    payment_date,
    amount_cents,
    reconciliation_notes,
    method,
    recorded_by,
    updated_by
  )
  VALUES (
    p_invoice_id,
    p_invoice_type,
    v_rto_id,
    p_payment_date,
    p_amount_cents,
    p_notes,
    COALESCE(p_method, 'OTHER'::public.payment_method_enum),
    auth.uid(),
    auth.uid()
  )
  RETURNING id INTO v_payment_id;

  -- Update appropriate invoice table
  IF p_invoice_type = 'APPLICATION' THEN
    UPDATE public.application_invoices
    SET amount_paid_cents = amount_paid_cents + p_amount_cents,
        internal_payment_status = CASE
          WHEN v_new_paid <= 0 THEN 'UNPAID'::public.internal_payment_status
          WHEN v_new_paid < v_amount_due_cents THEN 'PARTIALLY_PAID'::public.internal_payment_status
          ELSE 'PAID_INTERNAL'::public.internal_payment_status
        END
        -- Note: application invoices cannot change to PAID status (only SCHEDULED or VOID)
    WHERE id = p_invoice_id;
  ELSIF p_invoice_type = 'ENROLLMENT' THEN
    UPDATE public.enrollment_invoices
    SET amount_paid_cents = amount_paid_cents + p_amount_cents,
        internal_payment_status = CASE
          WHEN v_new_paid <= 0 THEN 'UNPAID'::public.internal_payment_status
          WHEN v_new_paid < v_amount_due_cents THEN 'PARTIALLY_PAID'::public.internal_payment_status
          ELSE 'PAID_INTERNAL'::public.internal_payment_status
        END,
        status = CASE
          WHEN v_new_paid >= v_amount_due_cents THEN 'PAID'
          ELSE status
        END
    WHERE id = p_invoice_id;
  END IF;

  RETURN v_payment_id;
END;
$$;

COMMENT ON FUNCTION public.record_payment IS 'Records a payment against an invoice (application or enrollment) with tenant enforcement, positive-amount check, status sync, audit fields, and returns payment_id.';

COMMIT;

