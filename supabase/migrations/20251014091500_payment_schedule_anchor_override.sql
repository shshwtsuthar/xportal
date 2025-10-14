BEGIN;

-- Force payment schedule to exclusively use application.payment_anchor_date

CREATE OR REPLACE FUNCTION public.resolve_payment_anchor(
  p_app applications
)
RETURNS date AS $$
BEGIN
  IF p_app.payment_anchor_date IS NULL THEN
    RAISE EXCEPTION 'payment_anchor_date is required to build payment schedule';
  END IF;
  RETURN p_app.payment_anchor_date::date;
END;
$$ LANGUAGE plpgsql;

-- Recreate upsert to remove dependency on template.anchor_type

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

  DELETE FROM public.application_payment_schedule WHERE application_id = app_id;

  WITH inst AS (
    SELECT i.*, ROW_NUMBER() OVER (ORDER BY i.due_date_rule_days, i.name) AS seq
    FROM public.payment_plan_template_installments i
    WHERE i.template_id = v_app.payment_plan_template_id
  )
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
  FROM inst;

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


