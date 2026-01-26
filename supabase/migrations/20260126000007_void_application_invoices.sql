BEGIN;

-- Function to void unpaid application invoices when application is rejected
CREATE OR REPLACE FUNCTION public.void_application_invoices(
  p_application_id uuid
)
RETURNS TABLE(
  voided_count int
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_voided_count int := 0;
BEGIN
  -- Void all unpaid application invoices (amount_paid_cents = 0)
  UPDATE public.application_invoices
  SET status = 'VOID'
  WHERE application_id = p_application_id
    AND status = 'SCHEDULED'
    AND amount_paid_cents = 0;

  GET DIAGNOSTICS v_voided_count = ROW_COUNT;

  RETURN QUERY SELECT v_voided_count;
END;
$$;

COMMENT ON FUNCTION public.void_application_invoices IS 
  'Automatically voids unpaid application invoices when application is rejected. Paid deposits are not voided (require manual refund).';

-- Trigger to automatically void invoices when application status changes to REJECTED
CREATE OR REPLACE FUNCTION public.auto_void_invoices_on_rejection()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- If status changed to REJECTED, void unpaid invoices
  IF NEW.status = 'REJECTED' AND (OLD.status IS NULL OR OLD.status <> 'REJECTED') THEN
    PERFORM public.void_application_invoices(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.auto_void_invoices_on_rejection IS 
  'Automatically voids unpaid application invoices when application status changes to REJECTED.';

DROP TRIGGER IF EXISTS trigger_auto_void_invoices_on_rejection ON public.applications;
CREATE TRIGGER trigger_auto_void_invoices_on_rejection
  AFTER UPDATE OF status ON public.applications
  FOR EACH ROW
  WHEN (NEW.status = 'REJECTED' AND (OLD.status IS NULL OR OLD.status <> 'REJECTED'))
  EXECUTE FUNCTION public.auto_void_invoices_on_rejection();

COMMIT;
