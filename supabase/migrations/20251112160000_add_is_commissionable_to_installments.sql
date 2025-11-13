BEGIN;

-- Add is_commissionable column to payment_plan_template_installments table
ALTER TABLE public.payment_plan_template_installments
  ADD COLUMN IF NOT EXISTS is_commissionable BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.payment_plan_template_installments.is_commissionable IS 'Indicates whether this installment is eligible for commission calculations. Required field for all installments.';

COMMIT;

