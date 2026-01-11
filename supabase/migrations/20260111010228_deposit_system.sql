BEGIN;

-- ============================================================================
-- DEPOSIT SYSTEM IMPLEMENTATION
-- ============================================================================
-- This migration implements a deposit tracking system for applications.
-- Applicants can be required to pay certain instalments (deposits) before
-- their application can be accepted. Deposits are tracked separately from
-- invoices and are transferred upon approval.

-- ============================================================================
-- PHASE 1: Add is_deposit flag to existing tables
-- ============================================================================

-- 1.1: Add is_deposit to payment plan template installments
ALTER TABLE public.payment_plan_template_installments
  ADD COLUMN IF NOT EXISTS is_deposit BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.payment_plan_template_installments.is_deposit IS 
  'Indicates if this installment must be paid as a deposit before application acceptance';

-- 1.2: Add is_deposit to application payment schedule (snapshot)
ALTER TABLE public.application_payment_schedule
  ADD COLUMN IF NOT EXISTS is_deposit BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.application_payment_schedule.is_deposit IS 
  'Snapshot of is_deposit flag from template at time of schedule creation';

-- ============================================================================
-- PHASE 2: Create deposit invoice status enum
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE public.deposit_invoice_status AS ENUM (
    'UNPAID',
    'PARTIALLY_PAID',
    'PAID'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- PHASE 3: Create deposit invoice tables
-- ============================================================================

-- 3.1: Application deposit invoices table
CREATE TABLE IF NOT EXISTS public.application_deposit_invoices (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  application_payment_schedule_id UUID NOT NULL REFERENCES public.application_payment_schedule(id) ON DELETE CASCADE,
  rto_id UUID NOT NULL REFERENCES public.rtos(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  amount_due_cents INT NOT NULL CHECK (amount_due_cents >= 0),
  amount_paid_cents INT NOT NULL DEFAULT 0 CHECK (amount_paid_cents >= 0),
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,
  status public.deposit_invoice_status NOT NULL DEFAULT 'UNPAID',
  xero_invoice_id TEXT,
  xero_sync_status TEXT,
  xero_sync_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.application_deposit_invoices IS 
  'Pre-approval deposit invoices that must be paid before application acceptance';

CREATE INDEX IF NOT EXISTS idx_deposit_invoices_application_id 
  ON public.application_deposit_invoices(application_id);

CREATE INDEX IF NOT EXISTS idx_deposit_invoices_rto_id 
  ON public.application_deposit_invoices(rto_id);

CREATE INDEX IF NOT EXISTS idx_deposit_invoices_status 
  ON public.application_deposit_invoices(status);

-- 3.2: Deposit payments table
CREATE TABLE IF NOT EXISTS public.deposit_payments (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  deposit_invoice_id UUID NOT NULL REFERENCES public.application_deposit_invoices(id) ON DELETE CASCADE,
  rto_id UUID NOT NULL REFERENCES public.rtos(id) ON DELETE CASCADE,
  payment_date DATE NOT NULL,
  amount_cents INT NOT NULL CHECK (amount_cents > 0),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id)
);

COMMENT ON TABLE public.deposit_payments IS 
  'Payments recorded against deposit invoices before application approval';

CREATE INDEX IF NOT EXISTS idx_deposit_payments_invoice_id 
  ON public.deposit_payments(deposit_invoice_id);

CREATE INDEX IF NOT EXISTS idx_deposit_payments_rto_id 
  ON public.deposit_payments(rto_id);

-- ============================================================================
-- PHASE 4: Row Level Security
-- ============================================================================

ALTER TABLE public.application_deposit_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deposit_payments ENABLE ROW LEVEL SECURITY;

-- RLS for application_deposit_invoices
DO $$ BEGIN
  CREATE POLICY deposit_invoices_tenant_rw ON public.application_deposit_invoices
  USING (rto_id = public.get_my_rto_id())
  WITH CHECK (rto_id = public.get_my_rto_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- RLS for deposit_payments
DO $$ BEGIN
  CREATE POLICY deposit_payments_tenant_rw ON public.deposit_payments
  USING (rto_id = public.get_my_rto_id())
  WITH CHECK (rto_id = public.get_my_rto_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- PHASE 5: Trigger to update deposit invoice status
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_deposit_invoice_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalculate amount_paid_cents and update status
  UPDATE public.application_deposit_invoices
  SET 
    amount_paid_cents = (
      SELECT COALESCE(SUM(amount_cents), 0)
      FROM public.deposit_payments
      WHERE deposit_invoice_id = NEW.deposit_invoice_id
    ),
    status = CASE
      WHEN (
        SELECT COALESCE(SUM(amount_cents), 0)
        FROM public.deposit_payments
        WHERE deposit_invoice_id = NEW.deposit_invoice_id
      ) = 0 THEN 'UNPAID'::public.deposit_invoice_status
      WHEN (
        SELECT COALESCE(SUM(amount_cents), 0)
        FROM public.deposit_payments
        WHERE deposit_invoice_id = NEW.deposit_invoice_id
      ) >= amount_due_cents THEN 'PAID'::public.deposit_invoice_status
      ELSE 'PARTIALLY_PAID'::public.deposit_invoice_status
    END,
    updated_at = NOW()
  WHERE id = NEW.deposit_invoice_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_update_deposit_invoice_status ON public.deposit_payments;
CREATE TRIGGER trg_update_deposit_invoice_status
AFTER INSERT OR UPDATE OR DELETE ON public.deposit_payments
FOR EACH ROW EXECUTE FUNCTION public.update_deposit_invoice_status();

-- ============================================================================
-- PHASE 6: Immutability constraint
-- ============================================================================

CREATE OR REPLACE FUNCTION public.prevent_payment_plan_change_with_deposits()
RETURNS TRIGGER AS $$
BEGIN
  -- Only check if payment_plan_template_id is being changed
  IF OLD.payment_plan_template_id IS DISTINCT FROM NEW.payment_plan_template_id THEN
    -- Check if any deposit payments exist for this application
    IF EXISTS (
      SELECT 1 
      FROM public.deposit_payments dp
      JOIN public.application_deposit_invoices adi ON dp.deposit_invoice_id = adi.id
      WHERE adi.application_id = NEW.id
    ) THEN
      RAISE EXCEPTION 'Cannot change payment plan after deposit payments have been recorded';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_payment_plan_change_with_deposits ON public.applications;
CREATE TRIGGER trg_prevent_payment_plan_change_with_deposits
BEFORE UPDATE ON public.applications
FOR EACH ROW EXECUTE FUNCTION public.prevent_payment_plan_change_with_deposits();

-- ============================================================================
-- PHASE 7: RPC function to record deposit payment
-- ============================================================================

CREATE OR REPLACE FUNCTION public.record_deposit_payment(
  p_deposit_invoice_id UUID,
  p_payment_date DATE,
  p_amount_cents INT,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_rto_id UUID;
  v_user_id UUID;
  v_payment_id UUID;
BEGIN
  -- Get the RTO ID from the deposit invoice
  SELECT rto_id INTO v_rto_id 
  FROM public.application_deposit_invoices 
  WHERE id = p_deposit_invoice_id;
  
  IF v_rto_id IS NULL THEN
    RAISE EXCEPTION 'Deposit invoice % not found', p_deposit_invoice_id;
  END IF;
  
  -- Get current user
  v_user_id := auth.uid();
  
  -- Validate amount
  IF p_amount_cents <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be greater than zero';
  END IF;
  
  -- Insert payment record
  INSERT INTO public.deposit_payments (
    deposit_invoice_id,
    rto_id,
    payment_date,
    amount_cents,
    notes,
    created_by
  ) VALUES (
    p_deposit_invoice_id,
    v_rto_id,
    p_payment_date,
    p_amount_cents,
    p_notes,
    v_user_id
  )
  RETURNING id INTO v_payment_id;
  
  -- Trigger will automatically update deposit invoice totals and status
  
  RETURN v_payment_id;
END;
$$;

-- ============================================================================
-- PHASE 8: RPC function to check if all deposits are fully paid
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_deposits_fully_paid(
  p_application_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_unpaid_count INT;
BEGIN
  -- Count deposit invoices that are not fully paid
  SELECT COUNT(*)
  INTO v_unpaid_count
  FROM public.application_deposit_invoices
  WHERE application_id = p_application_id
    AND amount_paid_cents < amount_due_cents;
  
  -- Return TRUE if all deposits are paid (no unpaid deposits)
  RETURN v_unpaid_count = 0;
END;
$$;

-- ============================================================================
-- PHASE 9: Update upsert_application_payment_schedule_draft function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.upsert_application_payment_schedule_draft(app_id uuid)
RETURNS TABLE(inserted_rows int) AS $$
DECLARE
  v_app applications;
  v_anchor date;
  v_cnt int;
BEGIN
  SELECT * INTO v_app FROM public.applications WHERE id = app_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Application % not found', app_id; END IF;
  IF v_app.status::text <> 'DRAFT' THEN RAISE EXCEPTION 'Application % must be DRAFT to upsert payment schedule', app_id; END IF;
  IF v_app.payment_plan_template_id IS NULL THEN RAISE EXCEPTION 'Application % missing payment_plan_template_id', app_id; END IF;

  v_anchor := public.resolve_payment_anchor(v_app);

  -- Delete existing schedule lines and schedule
  DELETE FROM public.application_payment_schedule_lines WHERE application_id = app_id;
  DELETE FROM public.application_payment_schedule WHERE application_id = app_id;
  
  -- Delete existing deposit invoices (if re-generating schedule)
  DELETE FROM public.application_deposit_invoices WHERE application_id = app_id;

  WITH inst AS (
    SELECT i.*, ROW_NUMBER() OVER (ORDER BY i.due_date_rule_days, i.name) AS seq
    FROM public.payment_plan_template_installments i
    WHERE i.template_id = v_app.payment_plan_template_id
  ),
  inserted AS (
    INSERT INTO public.application_payment_schedule (
      application_id, template_id, template_installment_id, name,
      amount_cents, due_date, sequence_order, anchor_type, anchor_date_used, is_deposit
    )
    SELECT app_id,
           v_app.payment_plan_template_id,
           inst.id,
           inst.name,
           inst.amount_cents,
           (v_anchor + make_interval(days => inst.due_date_rule_days))::date,
           inst.seq,
           'CUSTOM_DATE'::public.payment_plan_anchor_type,
           v_anchor,
           inst.is_deposit
    FROM inst
    RETURNING id, template_installment_id, is_deposit, name, amount_cents, due_date
  )
  INSERT INTO public.application_payment_schedule_lines (
    id,
    application_payment_schedule_id,
    application_id,
    template_installment_line_id,
    name,
    description,
    amount_cents,
    sequence_order,
    is_commissionable,
    xero_account_code,
    xero_tax_type,
    xero_item_code
  )
  SELECT
    extensions.uuid_generate_v4(),
    ins.id,
    app_id,
    tl.id,
    tl.name,
    tl.description,
    tl.amount_cents,
    tl.sequence_order,
    tl.is_commissionable,
    tl.xero_account_code,
    tl.xero_tax_type,
    tl.xero_item_code
  FROM inserted ins
  JOIN public.payment_plan_template_installment_lines tl
    ON tl.installment_id = ins.template_installment_id;

  -- Create deposit invoices for instalments marked as deposits
  INSERT INTO public.application_deposit_invoices (
    application_id,
    application_payment_schedule_id,
    rto_id,
    invoice_number,
    name,
    amount_due_cents,
    issue_date,
    due_date,
    status
  )
  SELECT
    app_id,
    aps.id,
    v_app.rto_id,
    'DEP-' || UPPER(SUBSTRING(gen_random_uuid()::text, 1, 8)),
    aps.name,
    aps.amount_cents,
    CURRENT_DATE,
    aps.due_date,
    'UNPAID'::public.deposit_invoice_status
  FROM public.application_payment_schedule aps
  WHERE aps.application_id = app_id
    AND aps.is_deposit = TRUE;

  SELECT COUNT(*) INTO v_cnt FROM public.application_payment_schedule WHERE application_id = app_id;
  RETURN QUERY SELECT v_cnt;
END;
$$ LANGUAGE plpgsql;

COMMIT;

