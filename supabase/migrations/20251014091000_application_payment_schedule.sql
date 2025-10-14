BEGIN;

-- Application Payment Schedule snapshot (per installment at application level)

CREATE TABLE public.application_payment_schedule (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES public.payment_plan_templates(id) ON DELETE RESTRICT,
  template_installment_id uuid NOT NULL REFERENCES public.payment_plan_template_installments(id) ON DELETE RESTRICT,
  name text NOT NULL,
  amount_cents int NOT NULL,
  due_date date NOT NULL,
  sequence_order int,
  anchor_type public.payment_plan_anchor_type NOT NULL,
  anchor_date_used date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (application_id, template_installment_id)
);

COMMENT ON TABLE public.application_payment_schedule IS 'Frozen payment schedule snapshot per application (derived from template + anchor)';

CREATE INDEX idx_aps_app ON public.application_payment_schedule(application_id);
CREATE INDEX idx_aps_tpl ON public.application_payment_schedule(template_id);

ALTER TABLE public.application_payment_schedule ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY aps_tenant_rw ON public.application_payment_schedule
  USING (
    EXISTS (
      SELECT 1 FROM public.applications a
      WHERE a.id = application_id
        AND a.rto_id = public.get_my_rto_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.applications a
      WHERE a.id = application_id
        AND a.rto_id = public.get_my_rto_id()
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Immutability: writes allowed only while application is DRAFT

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
  IF v_app_status <> 'DRAFT' THEN
    RAISE EXCEPTION 'Payment schedule snapshot is immutable unless application is DRAFT (current: %)', v_app_status;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_aps_immutable ON public.application_payment_schedule;
CREATE TRIGGER trg_aps_immutable
BEFORE INSERT OR UPDATE OR DELETE ON public.application_payment_schedule
FOR EACH ROW EXECUTE FUNCTION public.ensure_app_draft_for_payment_schedule();

-- Helper to resolve anchor based on precedence: user-selected first, else template rule

CREATE OR REPLACE FUNCTION public.resolve_payment_anchor(
  p_app applications
)
RETURNS date AS $$
DECLARE
  v_tpl_anchor public.payment_plan_anchor_type;
  v_anchor date;
BEGIN
  -- User-provided anchor always wins if present
  IF p_app.payment_anchor_date IS NOT NULL THEN
    RETURN p_app.payment_anchor_date::date;
  END IF;

  SELECT anchor_type INTO v_tpl_anchor FROM public.payment_plan_templates WHERE id = p_app.payment_plan_template_id;
  IF v_tpl_anchor IS NULL THEN
    RAISE EXCEPTION 'Template % not found', p_app.payment_plan_template_id;
  END IF;

  IF v_tpl_anchor = 'COMMENCEMENT_DATE' THEN
    v_anchor := p_app.proposed_commencement_date::date;
  ELSIF v_tpl_anchor = 'OFFER_DATE' THEN
    v_anchor := (p_app.offer_generated_at)::date;
  ELSIF v_tpl_anchor = 'CUSTOM_DATE' THEN
    v_anchor := NULL; -- must be supplied by user; fall through to error
  END IF;

  IF v_anchor IS NULL THEN
    RAISE EXCEPTION 'Missing anchor date for template rule %', v_tpl_anchor;
  END IF;
  RETURN v_anchor;
END;
$$ LANGUAGE plpgsql;

-- Draft upsert RPC

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
  ), tpl AS (
    SELECT anchor_type FROM public.payment_plan_templates WHERE id = v_app.payment_plan_template_id
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
         (SELECT anchor_type FROM tpl),
         v_anchor
  FROM inst;

  SELECT COUNT(*) INTO v_cnt FROM public.application_payment_schedule WHERE application_id = app_id;
  RETURN QUERY SELECT v_cnt;
END;
$$ LANGUAGE plpgsql;

-- Freeze RPC (allowed to be called by submission/approval orchestration)

CREATE OR REPLACE FUNCTION public.freeze_application_payment_schedule(app_id uuid)
RETURNS TABLE(inserted_rows int) AS $$
DECLARE
  v_app applications;
BEGIN
  SELECT * INTO v_app FROM public.applications WHERE id = app_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Application % not found', app_id; END IF;
  -- Reuse the same logic; immutability trigger prevents changing after status flips from DRAFT
  RETURN QUERY SELECT * FROM public.upsert_application_payment_schedule_draft(app_id);
END;
$$ LANGUAGE plpgsql;

COMMIT;


