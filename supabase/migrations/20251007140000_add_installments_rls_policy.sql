BEGIN;

-- Add RLS policy for payment_plan_template_installments
-- Installments inherit RTO from their parent template
CREATE POLICY "rls_payment_plan_template_installments_all" 
ON public.payment_plan_template_installments 
FOR ALL 
USING (
  (SELECT rto_id FROM public.payment_plan_templates WHERE id = template_id) = public.get_my_rto_id()
) 
WITH CHECK (
  (SELECT rto_id FROM public.payment_plan_templates WHERE id = template_id) = public.get_my_rto_id()
);

COMMIT;
