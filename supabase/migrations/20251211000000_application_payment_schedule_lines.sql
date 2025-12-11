BEGIN;

-- Snapshot table for installment lines at submission time
CREATE TABLE IF NOT EXISTS public.application_payment_schedule_lines (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  application_payment_schedule_id uuid NOT NULL REFERENCES public.application_payment_schedule(id) ON DELETE CASCADE,
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  template_installment_line_id uuid REFERENCES public.payment_plan_template_installment_lines(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  amount_cents int NOT NULL CHECK (amount_cents >= 0),
  sequence_order int NOT NULL DEFAULT 0,
  is_commissionable boolean NOT NULL DEFAULT false,
  xero_account_code text,
  xero_tax_type text,
  xero_item_code text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_aps_lines_app_id
  ON public.application_payment_schedule_lines (application_id);

CREATE INDEX IF NOT EXISTS idx_aps_lines_schedule_id
  ON public.application_payment_schedule_lines (application_payment_schedule_id);

ALTER TABLE public.application_payment_schedule_lines ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY aps_lines_tenant_rw ON public.application_payment_schedule_lines
  USING (
    EXISTS (
      SELECT 1
      FROM public.applications a
      WHERE a.id = application_id
        AND a.rto_id = public.get_my_rto_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.applications a
      WHERE a.id = application_id
        AND a.rto_id = public.get_my_rto_id()
    )
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

-- Recreate upsert to also snapshot lines
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

  DELETE FROM public.application_payment_schedule_lines WHERE application_id = app_id;
  DELETE FROM public.application_payment_schedule WHERE application_id = app_id;

  WITH inst AS (
    SELECT i.*, ROW_NUMBER() OVER (ORDER BY i.due_date_rule_days, i.name) AS seq
    FROM public.payment_plan_template_installments i
    WHERE i.template_id = v_app.payment_plan_template_id
  ),
  inserted AS (
    INSERT INTO public.application_payment_schedule (
      application_id, template_id, template_installment_id, name,
      amount_cents, due_date, sequence_order, anchor_type, anchor_date_used
    )
    SELECT app_id,
           v_app.payment_plan_template_id,
           inst.id,
           inst.name,
           inst.amount_cents,
           (v_anchor + make_interval(days => inst.due_date_rule_days))::date,
           inst.seq,
           'CUSTOM_DATE'::public.payment_plan_anchor_type,
           v_anchor
    FROM inst
    RETURNING id, template_installment_id
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
    tpl.id,
    tpl.name,
    tpl.description,
    tpl.amount_cents,
    tpl.sequence_order,
    tpl.is_commissionable,
    tpl.xero_account_code,
    tpl.xero_tax_type,
    tpl.xero_item_code
  FROM inserted ins
  JOIN public.payment_plan_template_installment_lines tpl
    ON tpl.installment_id = ins.template_installment_id;

  SELECT COUNT(*) INTO v_cnt FROM public.application_payment_schedule WHERE application_id = app_id;
  RETURN QUERY SELECT v_cnt;
END;
$$ LANGUAGE plpgsql;

-- Freeze keeps delegating to upsert (immutability trigger controls lifecycle)
CREATE OR REPLACE FUNCTION public.freeze_application_payment_schedule(app_id uuid)
RETURNS TABLE(inserted_rows int) AS $$
BEGIN
  RETURN QUERY SELECT * FROM public.upsert_application_payment_schedule_draft(app_id);
END;
$$ LANGUAGE plpgsql;

COMMIT;
