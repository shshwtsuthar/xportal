BEGIN;

-- Remove anchor_type from payment_plan_templates since anchor is selected during application
ALTER TABLE public.payment_plan_templates DROP COLUMN IF EXISTS anchor_type;

COMMIT;
