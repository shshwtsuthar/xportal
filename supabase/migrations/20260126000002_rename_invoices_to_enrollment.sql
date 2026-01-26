BEGIN;

-- Step 1: Drop dependent objects that reference invoices/invoice_lines

-- Drop the finance_logs_view (will recreate later)
DROP VIEW IF EXISTS public.finance_logs_view;

-- Drop FK constraints from dependent tables
ALTER TABLE IF EXISTS public.payments 
  DROP CONSTRAINT IF EXISTS payments_invoice_id_fkey;

ALTER TABLE IF EXISTS public.invoice_lines 
  DROP CONSTRAINT IF EXISTS invoice_lines_invoice_id_fkey;

ALTER TABLE IF EXISTS public.invoice_reminders_sent 
  DROP CONSTRAINT IF EXISTS invoice_reminders_sent_invoice_id_fkey;

-- Step 2: Rename tables
ALTER TABLE IF EXISTS public.invoices 
  RENAME TO enrollment_invoices;

ALTER TABLE IF EXISTS public.invoice_lines 
  RENAME TO enrollment_invoice_lines;

-- Step 3: Rename constraints and indexes
-- Rename primary key constraints
ALTER TABLE IF EXISTS public.enrollment_invoices 
  RENAME CONSTRAINT invoices_pkey TO enrollment_invoices_pkey;

ALTER TABLE IF EXISTS public.enrollment_invoice_lines 
  RENAME CONSTRAINT invoice_lines_pkey TO enrollment_invoice_lines_pkey;

-- Rename unique constraints
DO $$ 
BEGIN
  ALTER TABLE IF EXISTS public.enrollment_invoices 
    RENAME CONSTRAINT invoices_invoice_number_key TO enrollment_invoices_invoice_number_key;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- Rename check constraints
DO $$ 
BEGIN
  ALTER TABLE IF EXISTS public.enrollment_invoices 
    RENAME CONSTRAINT invoices_xero_sync_status_check TO enrollment_invoices_xero_sync_status_check;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- Rename indexes
ALTER INDEX IF EXISTS idx_invoices_invoice_number 
  RENAME TO idx_enrollment_invoices_invoice_number;

ALTER INDEX IF EXISTS idx_invoice_lines_invoice_id 
  RENAME TO idx_enrollment_invoice_lines_invoice_id;

-- Step 4: Recreate FK constraints with new table names
ALTER TABLE public.payments
  ADD CONSTRAINT payments_invoice_id_fkey 
  FOREIGN KEY (invoice_id) 
  REFERENCES public.enrollment_invoices(id) 
  ON DELETE CASCADE;

ALTER TABLE public.enrollment_invoice_lines
  ADD CONSTRAINT enrollment_invoice_lines_invoice_id_fkey 
  FOREIGN KEY (invoice_id) 
  REFERENCES public.enrollment_invoices(id) 
  ON DELETE CASCADE;

ALTER TABLE public.invoice_reminders_sent
  ADD CONSTRAINT invoice_reminders_sent_invoice_id_fkey 
  FOREIGN KEY (invoice_id) 
  REFERENCES public.enrollment_invoices(id) 
  ON DELETE CASCADE;

-- Step 5: Update RLS policies
-- Drop old policies
DROP POLICY IF EXISTS invoices_tenant_rw ON public.enrollment_invoices;
DROP POLICY IF EXISTS invoice_lines_tenant_rw ON public.enrollment_invoice_lines;

-- Create new policies with updated names
DO $$ BEGIN
  CREATE POLICY enrollment_invoices_tenant_rw ON public.enrollment_invoices
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

DO $$ BEGIN
  CREATE POLICY enrollment_invoice_lines_tenant_rw ON public.enrollment_invoice_lines
  USING (
    EXISTS (
      SELECT 1 
      FROM public.enrollment_invoices ei
      JOIN public.enrollments e ON e.id = ei.enrollment_id
      WHERE ei.id = invoice_id
        AND e.rto_id = public.get_my_rto_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM public.enrollment_invoices ei
      JOIN public.enrollments e ON e.id = ei.enrollment_id
      WHERE ei.id = invoice_id
        AND e.rto_id = public.get_my_rto_id()
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Update invoice_reminders_sent policy to use new table name
DROP POLICY IF EXISTS invoice_reminders_sent_select ON public.invoice_reminders_sent;
CREATE POLICY invoice_reminders_sent_select ON public.invoice_reminders_sent
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.enrollment_invoices
      WHERE enrollment_invoices.id = invoice_reminders_sent.invoice_id
        AND enrollment_invoices.rto_id = public.get_my_rto_id()
    )
    OR public.is_admin()
  );

-- Step 6: Recreate finance_logs_view with new table names
CREATE OR REPLACE VIEW public.finance_logs_view AS
SELECT
  concat('invoice-pdf-', inv.id) AS log_id,
  'invoice_pdf'::text AS event_type,
  inv.pdf_generation_status::text AS status,
  COALESCE(inv.pdf_generated_at, inv.issue_date::timestamptz) AS occurred_at,
  inv.id AS invoice_id,
  NULL::uuid AS payment_id,
  NULL::uuid AS commission_invoice_id,
  NULL::uuid AS commission_payment_id,
  enr.student_id,
  enr.program_id,
  inv.rto_id,
  inv.amount_due_cents,
  inv.invoice_number,
  (COALESCE(st.first_name, '') || ' ' || COALESCE(st.last_name, ''))::text AS student_name,
  st.email AS student_email,
  pr.name AS program_name,
  inv.pdf_generation_attempts AS attempts,
  inv.last_pdf_error AS message
FROM public.enrollment_invoices inv
LEFT JOIN public.enrollments enr ON enr.id = inv.enrollment_id
LEFT JOIN public.students st ON st.id = enr.student_id
LEFT JOIN public.programs pr ON pr.id = enr.program_id

UNION ALL

SELECT
  concat('invoice-email-', inv.id) AS log_id,
  'invoice_email'::text AS event_type,
  CASE WHEN inv.last_email_sent_at IS NOT NULL THEN 'sent' ELSE 'pending' END AS status,
  COALESCE(inv.last_email_sent_at, inv.issue_date::timestamptz) AS occurred_at,
  inv.id AS invoice_id,
  NULL::uuid AS payment_id,
  NULL::uuid AS commission_invoice_id,
  NULL::uuid AS commission_payment_id,
  enr.student_id,
  enr.program_id,
  inv.rto_id,
  inv.amount_due_cents,
  inv.invoice_number,
  (COALESCE(st.first_name, '') || ' ' || COALESCE(st.last_name, ''))::text AS student_name,
  st.email AS student_email,
  pr.name AS program_name,
  inv.pdf_generation_attempts AS attempts,
  inv.last_pdf_error AS message
FROM public.enrollment_invoices inv
LEFT JOIN public.enrollments enr ON enr.id = inv.enrollment_id
LEFT JOIN public.students st ON st.id = enr.student_id
LEFT JOIN public.programs pr ON pr.id = enr.program_id

UNION ALL

SELECT
  concat('payment-', pay.id) AS log_id,
  'payment_received'::text AS event_type,
  'completed'::text AS status,
  pay.payment_date::timestamptz AS occurred_at,
  pay.invoice_id AS invoice_id,
  pay.id AS payment_id,
  NULL::uuid AS commission_invoice_id,
  NULL::uuid AS commission_payment_id,
  enr.student_id,
  enr.program_id,
  pay.rto_id,
  pay.amount_cents,
  inv.invoice_number,
  (COALESCE(st.first_name, '') || ' ' || COALESCE(st.last_name, ''))::text AS student_name,
  st.email AS student_email,
  pr.name AS program_name,
  NULL::integer AS attempts,
  pay.reconciliation_notes AS message
FROM public.payments pay
LEFT JOIN public.enrollment_invoices inv ON inv.id = pay.invoice_id
LEFT JOIN public.enrollments enr ON enr.id = inv.enrollment_id
LEFT JOIN public.students st ON st.id = enr.student_id
LEFT JOIN public.programs pr ON pr.id = enr.program_id

UNION ALL

SELECT
  concat('commission-invoice-', ci.id) AS log_id,
  'commission_invoice'::text AS event_type,
  ci.status::text AS status,
  ci.issue_date::timestamptz AS occurred_at,
  NULL::uuid AS invoice_id,
  NULL::uuid AS payment_id,
  ci.id AS commission_invoice_id,
  NULL::uuid AS commission_payment_id,
  ci.student_id,
  enr.program_id,
  ci.rto_id,
  ci.total_amount_cents,
  ci.invoice_number,
  (COALESCE(st.first_name, '') || ' ' || COALESCE(st.last_name, ''))::text AS student_name,
  st.email AS student_email,
  pr.name AS program_name,
  NULL::integer AS attempts,
  ci.payment_reference AS message
FROM public.commission_invoices ci
LEFT JOIN public.enrollments enr ON enr.id = ci.enrollment_id
LEFT JOIN public.students st ON st.id = ci.student_id
LEFT JOIN public.programs pr ON pr.id = enr.program_id

UNION ALL

SELECT
  concat('commission-payment-', cp.id) AS log_id,
  'commission_payment'::text AS event_type,
  'completed'::text AS status,
  cp.payment_date::timestamptz AS occurred_at,
  NULL::uuid AS invoice_id,
  NULL::uuid AS payment_id,
  cp.commission_invoice_id AS commission_invoice_id,
  cp.id AS commission_payment_id,
  ci.student_id,
  enr.program_id,
  cp.rto_id,
  cp.amount_cents,
  ci.invoice_number,
  (COALESCE(st.first_name, '') || ' ' || COALESCE(st.last_name, ''))::text AS student_name,
  st.email AS student_email,
  pr.name AS program_name,
  NULL::integer AS attempts,
  cp.reference AS message
FROM public.commission_payments cp
JOIN public.commission_invoices ci ON ci.id = cp.commission_invoice_id
LEFT JOIN public.enrollments enr ON enr.id = ci.enrollment_id
LEFT JOIN public.students st ON st.id = ci.student_id
LEFT JOIN public.programs pr ON pr.id = enr.program_id;

COMMENT ON VIEW public.finance_logs_view IS 'Unified finance log events (invoice PDF/email, payments, commission invoices/payments) for UI consumption.';

COMMENT ON TABLE public.enrollment_invoices IS 'Invoices for enrolled students. Created from application_invoices during approval or directly from enrollment_payment_schedule.';
COMMENT ON TABLE public.enrollment_invoice_lines IS 'Line items for enrollment invoices.';

COMMIT;
