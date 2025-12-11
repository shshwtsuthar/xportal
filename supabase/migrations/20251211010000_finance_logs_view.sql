BEGIN;

-- Consolidated finance log view for invoices, payments, and commissions
DROP VIEW IF EXISTS public.finance_logs_view;

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
FROM public.invoices inv
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
FROM public.invoices inv
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
LEFT JOIN public.invoices inv ON inv.id = pay.invoice_id
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

COMMIT;
