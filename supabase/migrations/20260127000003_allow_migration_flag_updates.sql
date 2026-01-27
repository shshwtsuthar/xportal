-- Allow updates to migrated_to_enrollment flag even when application is not DRAFT
-- This is needed for the approval process to mark payment schedules as migrated

CREATE OR REPLACE FUNCTION public.ensure_app_draft_for_payment_schedule()
RETURNS trigger AS $$
DECLARE
  v_app_status text;
  v_app_id uuid;
BEGIN
  v_app_id := COALESCE(NEW.application_id, OLD.application_id);
  SELECT status::text INTO v_app_status FROM public.applications WHERE id = v_app_id;
  
  IF v_app_status IS NULL THEN
    RAISE EXCEPTION 'Application % not found for payment schedule', v_app_id;
  END IF;
  
  -- Allow updates if only the migrated_to_enrollment flag is changing
  IF TG_OP = 'UPDATE' THEN
    -- Check if only migrated_to_enrollment is being updated
    IF NEW.migrated_to_enrollment IS DISTINCT FROM OLD.migrated_to_enrollment AND
       NEW.application_id = OLD.application_id AND
       NEW.template_id = OLD.template_id AND
       NEW.template_installment_id = OLD.template_installment_id AND
       NEW.name = OLD.name AND
       NEW.amount_cents = OLD.amount_cents AND
       NEW.due_date = OLD.due_date AND
       NEW.sequence_order = OLD.sequence_order AND
       NEW.anchor_type = OLD.anchor_type AND
       NEW.anchor_date_used = OLD.anchor_date_used THEN
      -- Only migrated_to_enrollment changed, allow it
      RETURN NEW;
    END IF;
  END IF;
  
  -- For all other changes (INSERT, DELETE, or UPDATE of other fields),
  -- enforce DRAFT status requirement
  IF v_app_status <> 'DRAFT' THEN
    RAISE EXCEPTION 'Payment schedule snapshot is immutable unless application is DRAFT (current: %)', v_app_status;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.ensure_app_draft_for_payment_schedule IS 
  'Ensures payment schedule can only be modified when application is DRAFT, except for migrated_to_enrollment flag which can be updated during approval process.';
