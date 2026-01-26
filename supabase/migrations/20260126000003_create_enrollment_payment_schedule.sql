BEGIN;

-- Enrollment Payment Schedule snapshot (per installment at enrollment level)
-- This is copied from application_payment_schedule during approval

CREATE TABLE IF NOT EXISTS public.enrollment_payment_schedule (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  enrollment_id uuid NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES public.payment_plan_templates(id) ON DELETE RESTRICT,
  template_installment_id uuid NOT NULL REFERENCES public.payment_plan_template_installments(id) ON DELETE RESTRICT,
  name text NOT NULL,
  amount_cents int NOT NULL,
  due_date date NOT NULL,
  sequence_order int,
  anchor_type public.payment_plan_anchor_type NOT NULL,
  anchor_date_used date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (enrollment_id, template_installment_id)
);

COMMENT ON TABLE public.enrollment_payment_schedule IS 'Frozen payment schedule snapshot per enrollment (copied from application_payment_schedule during approval)';

CREATE INDEX IF NOT EXISTS idx_eps_enrollment 
  ON public.enrollment_payment_schedule(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_eps_tpl 
  ON public.enrollment_payment_schedule(template_id);

ALTER TABLE public.enrollment_payment_schedule ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY eps_tenant_rw ON public.enrollment_payment_schedule
  USING (
    EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.id = enrollment_id
        AND e.rto_id = public.get_my_rto_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.id = enrollment_id
        AND e.rto_id = public.get_my_rto_id()
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Create enrollment_payment_schedule_lines table (mirrors application_payment_schedule_lines)
CREATE TABLE IF NOT EXISTS public.enrollment_payment_schedule_lines (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  enrollment_payment_schedule_id uuid NOT NULL REFERENCES public.enrollment_payment_schedule(id) ON DELETE CASCADE,
  enrollment_id uuid NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
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

COMMENT ON TABLE public.enrollment_payment_schedule_lines IS 'Line items for enrollment payment schedule (copied from application_payment_schedule_lines during approval)';

CREATE INDEX IF NOT EXISTS idx_eps_lines_enrollment_id
  ON public.enrollment_payment_schedule_lines (enrollment_id);

CREATE INDEX IF NOT EXISTS idx_eps_lines_schedule_id
  ON public.enrollment_payment_schedule_lines (enrollment_payment_schedule_id);

ALTER TABLE public.enrollment_payment_schedule_lines ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY eps_lines_tenant_rw ON public.enrollment_payment_schedule_lines
  USING (
    EXISTS (
      SELECT 1
      FROM public.enrollments e
      WHERE e.id = enrollment_id
        AND e.rto_id = public.get_my_rto_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.enrollments e
      WHERE e.id = enrollment_id
        AND e.rto_id = public.get_my_rto_id()
    )
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

COMMIT;
