BEGIN;

-- 1. Add is_deposit flag to installments
ALTER TABLE public.payment_plan_template_installments
  ADD COLUMN IF NOT EXISTS is_deposit BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.payment_plan_template_installments.is_deposit 
  IS 'Indicates whether this installment is a deposit. Deposits are excluded from reminder emails.';

-- 2. Add issue_date_offset_days to payment plan templates
-- Default 0 means issue_date = due_date (current behavior for non-first installments)
ALTER TABLE public.payment_plan_templates
  ADD COLUMN IF NOT EXISTS issue_date_offset_days INT NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.payment_plan_templates.issue_date_offset_days 
  IS 'Number of days offset from due_date to calculate issue_date. Negative values mean issue before due date. Applied to all installments in this template.';

-- 3. Create reminders table
CREATE TABLE IF NOT EXISTS public.payment_plan_reminders (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  template_id UUID NOT NULL REFERENCES public.payment_plan_templates(id) ON DELETE CASCADE,
  rto_id UUID NOT NULL REFERENCES public.rtos(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  offset_days INT NOT NULL,
  mail_template_id UUID NOT NULL REFERENCES public.mail_templates(id) ON DELETE RESTRICT,
  regenerate_invoice BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.payment_plan_reminders IS 'Defines reminder emails to be sent at specific offsets from invoice due dates.';
COMMENT ON COLUMN public.payment_plan_reminders.template_id IS 'Payment plan template this reminder applies to.';
COMMENT ON COLUMN public.payment_plan_reminders.offset_days IS 'Days offset from due_date when reminder should trigger. Negative = before due date (e.g., -7 = 7 days before due).';
COMMENT ON COLUMN public.payment_plan_reminders.mail_template_id IS 'Mail template to use for the reminder email.';
COMMENT ON COLUMN public.payment_plan_reminders.regenerate_invoice IS 'If true, regenerate invoice PDF before sending reminder email.';

CREATE INDEX IF NOT EXISTS idx_payment_plan_reminders_template 
  ON public.payment_plan_reminders (template_id);

CREATE INDEX IF NOT EXISTS idx_payment_plan_reminders_rto 
  ON public.payment_plan_reminders (rto_id);

-- 4. Create tracking table for sent reminders
CREATE TABLE IF NOT EXISTS public.invoice_reminders_sent (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  reminder_id UUID NOT NULL REFERENCES public.payment_plan_reminders(id) ON DELETE CASCADE,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(invoice_id, reminder_id)
);

COMMENT ON TABLE public.invoice_reminders_sent IS 'Tracks which reminders have been sent for each invoice to prevent duplicates.';

CREATE INDEX IF NOT EXISTS idx_invoice_reminders_sent_invoice 
  ON public.invoice_reminders_sent (invoice_id);

CREATE INDEX IF NOT EXISTS idx_invoice_reminders_sent_reminder 
  ON public.invoice_reminders_sent (reminder_id);

-- 5. RLS policies for payment_plan_reminders
ALTER TABLE public.payment_plan_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payment_plan_reminders_select ON public.payment_plan_reminders;
CREATE POLICY payment_plan_reminders_select ON public.payment_plan_reminders
  FOR SELECT TO authenticated
  USING (rto_id = public.get_my_rto_id() OR public.is_admin());

DROP POLICY IF EXISTS payment_plan_reminders_insert ON public.payment_plan_reminders;
CREATE POLICY payment_plan_reminders_insert ON public.payment_plan_reminders
  FOR INSERT TO authenticated
  WITH CHECK (rto_id = public.get_my_rto_id() OR public.is_admin());

DROP POLICY IF EXISTS payment_plan_reminders_update ON public.payment_plan_reminders;
CREATE POLICY payment_plan_reminders_update ON public.payment_plan_reminders
  FOR UPDATE TO authenticated
  USING (rto_id = public.get_my_rto_id() OR public.is_admin());

DROP POLICY IF EXISTS payment_plan_reminders_delete ON public.payment_plan_reminders;
CREATE POLICY payment_plan_reminders_delete ON public.payment_plan_reminders
  FOR DELETE TO authenticated
  USING (rto_id = public.get_my_rto_id() OR public.is_admin());

-- 6. RLS policies for invoice_reminders_sent
ALTER TABLE public.invoice_reminders_sent ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS invoice_reminders_sent_select ON public.invoice_reminders_sent;
CREATE POLICY invoice_reminders_sent_select ON public.invoice_reminders_sent
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices
      WHERE invoices.id = invoice_reminders_sent.invoice_id
        AND invoices.rto_id = public.get_my_rto_id()
    )
    OR public.is_admin()
  );

-- Service role only for insert (done by cron job)
DROP POLICY IF EXISTS invoice_reminders_sent_insert ON public.invoice_reminders_sent;
CREATE POLICY invoice_reminders_sent_insert ON public.invoice_reminders_sent
  FOR INSERT TO service_role
  WITH CHECK (true);

-- 7. Trigger to auto-update updated_at on reminders
CREATE OR REPLACE FUNCTION public.update_payment_plan_reminders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_payment_plan_reminders_updated_at ON public.payment_plan_reminders;
CREATE TRIGGER trg_payment_plan_reminders_updated_at
  BEFORE UPDATE ON public.payment_plan_reminders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_payment_plan_reminders_updated_at();

COMMIT;

