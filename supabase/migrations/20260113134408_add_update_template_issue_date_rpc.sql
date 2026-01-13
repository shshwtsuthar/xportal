BEGIN;

-- RPC function to update template issue_date_offset_days and recalculate affected invoices
-- This ensures atomicity - either all updates succeed or all fail
CREATE OR REPLACE FUNCTION public.update_template_issue_date_offset(
  p_template_id uuid,
  p_offset_days int
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_updated_count int;
  v_today date := CURRENT_DATE;
BEGIN
  -- Update template
  UPDATE public.payment_plan_templates
  SET issue_date_offset_days = p_offset_days
  WHERE id = p_template_id;
  
  -- If no rows updated, template doesn't exist
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Template not found'
    );
  END IF;
  
  -- Update invoices in transaction
  -- Only update SCHEDULED invoices with future issue_date and no payments
  WITH updated_invoices AS (
    UPDATE public.invoices
    SET issue_date = GREATEST(
      due_date + p_offset_days,
      v_today
    )
    WHERE enrollment_id IN (
      SELECT id FROM public.enrollments WHERE payment_plan_template_id = p_template_id
    )
    AND status = 'SCHEDULED'
    AND issue_date > v_today
    AND amount_paid_cents = 0
    RETURNING id
  )
  SELECT COUNT(*) INTO v_updated_count FROM updated_invoices;
  
  RETURN jsonb_build_object(
    'success', true,
    'invoicesUpdated', v_updated_count
  );
END;
$$;

COMMENT ON FUNCTION public.update_template_issue_date_offset IS 
  'Updates payment plan template issue_date_offset_days and recalculates issue dates for all affected SCHEDULED invoices. Ensures atomicity - all updates succeed or all fail.';

COMMIT;

