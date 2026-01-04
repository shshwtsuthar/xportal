BEGIN;

-- Secure tables that are not protected by RLS policies
-- This migration addresses security gaps for tables that should be tenant-scoped

-- 1. classrooms table (has direct rto_id column)
ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS rls_classrooms_all ON public.classrooms;
  CREATE POLICY rls_classrooms_all ON public.classrooms
    FOR ALL
    USING (rto_id = public.get_my_effective_rto_id())
    WITH CHECK (rto_id = public.get_my_effective_rto_id());
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- 2. commission_invoice_sequences table (has direct rto_id column)
ALTER TABLE public.commission_invoice_sequences ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS rls_commission_invoice_sequences_all ON public.commission_invoice_sequences;
  CREATE POLICY rls_commission_invoice_sequences_all ON public.commission_invoice_sequences
    FOR ALL
    USING (rto_id = public.get_my_effective_rto_id())
    WITH CHECK (rto_id = public.get_my_effective_rto_id());
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- 3. invoice_lines table (scoped via invoices)
ALTER TABLE public.invoice_lines ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS rls_invoice_lines_all ON public.invoice_lines;
  CREATE POLICY rls_invoice_lines_all ON public.invoice_lines
    FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM public.invoices i
        WHERE i.id = invoice_lines.invoice_id
          AND i.rto_id = public.get_my_effective_rto_id()
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.invoices i
        WHERE i.id = invoice_lines.invoice_id
          AND i.rto_id = public.get_my_effective_rto_id()
      )
    );
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- 4. payment_plan_template_installments table (RLS was not enabled, policy existed but didn't work)
ALTER TABLE public.payment_plan_template_installments ENABLE ROW LEVEL SECURITY;

-- Update existing policy to use effective RTO function for consistency
DO $$ BEGIN
  DROP POLICY IF EXISTS "rls_payment_plan_template_installments_all" ON public.payment_plan_template_installments;
  CREATE POLICY "rls_payment_plan_template_installments_all" ON public.payment_plan_template_installments
    FOR ALL
    USING (
      (SELECT rto_id FROM public.payment_plan_templates WHERE id = template_id) = public.get_my_effective_rto_id()
    )
    WITH CHECK (
      (SELECT rto_id FROM public.payment_plan_templates WHERE id = template_id) = public.get_my_effective_rto_id()
    );
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- 5. payment_plan_template_installment_lines table (scoped via installments -> templates)
ALTER TABLE public.payment_plan_template_installment_lines ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS rls_payment_plan_template_installment_lines_all ON public.payment_plan_template_installment_lines;
  CREATE POLICY rls_payment_plan_template_installment_lines_all ON public.payment_plan_template_installment_lines
    FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM public.payment_plan_template_installments i
        JOIN public.payment_plan_templates t ON t.id = i.template_id
        WHERE i.id = payment_plan_template_installment_lines.installment_id
          AND t.rto_id = public.get_my_effective_rto_id()
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.payment_plan_template_installments i
        JOIN public.payment_plan_templates t ON t.id = i.template_id
        WHERE i.id = payment_plan_template_installment_lines.installment_id
          AND t.rto_id = public.get_my_effective_rto_id()
      )
    );
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- 6. student_disabilities table (has direct rto_id column)
ALTER TABLE public.student_disabilities ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS rls_student_disabilities_all ON public.student_disabilities;
  CREATE POLICY rls_student_disabilities_all ON public.student_disabilities
    FOR ALL
    USING (rto_id = public.get_my_effective_rto_id())
    WITH CHECK (rto_id = public.get_my_effective_rto_id());
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- 7. student_id_sequences table (has direct rto_id column)
ALTER TABLE public.student_id_sequences ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS rls_student_id_sequences_all ON public.student_id_sequences;
  CREATE POLICY rls_student_id_sequences_all ON public.student_id_sequences
    FOR ALL
    USING (rto_id = public.get_my_effective_rto_id())
    WITH CHECK (rto_id = public.get_my_effective_rto_id());
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- 8. student_prior_education table (has direct rto_id column)
ALTER TABLE public.student_prior_education ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS rls_student_prior_education_all ON public.student_prior_education;
  CREATE POLICY rls_student_prior_education_all ON public.student_prior_education
    FOR ALL
    USING (rto_id = public.get_my_effective_rto_id())
    WITH CHECK (rto_id = public.get_my_effective_rto_id());
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- Note: finance_logs_view is a VIEW and inherits RLS from underlying tables,
-- so it doesn't need direct RLS protection.

COMMIT;
