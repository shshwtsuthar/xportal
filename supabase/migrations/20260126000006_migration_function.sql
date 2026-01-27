BEGIN;

-- Add migrated_to_enrollment flag to application_payment_schedule
ALTER TABLE public.application_payment_schedule
  ADD COLUMN IF NOT EXISTS migrated_to_enrollment boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.application_payment_schedule.migrated_to_enrollment IS 'True when this schedule has been copied to enrollment_payment_schedule during approval.';

-- Create migration function
CREATE OR REPLACE FUNCTION public.migrate_application_invoices_to_enrollment(
  p_application_id uuid,
  p_enrollment_id uuid
)
RETURNS TABLE(
  enrollment_invoices_created int,
  payments_migrated int,
  remaining_invoices_created int
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_app applications%ROWTYPE;
  v_enrollment enrollments%ROWTYPE;
  v_schedule_row application_payment_schedule%ROWTYPE;
  v_schedule_line_row application_payment_schedule_lines%ROWTYPE;
  v_app_invoice application_invoices%ROWTYPE;
  v_app_invoice_line application_invoice_lines%ROWTYPE;
  v_enr_invoice_id uuid;
  v_enr_schedule_id uuid;
  v_old_invoice_id uuid;
  v_payment payments%ROWTYPE;
  v_enrollment_invoices_count int := 0;
  v_payments_migrated_count int := 0;
  v_remaining_invoices_count int := 0;
  v_invoice_number text;
  v_issue_date date;
  v_due_date date;
  v_template payment_plan_templates%ROWTYPE;
  v_installment payment_plan_template_installments%ROWTYPE;
BEGIN
  -- Validate inputs
  SELECT * INTO v_app FROM public.applications WHERE id = p_application_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application % not found', p_application_id;
  END IF;

  SELECT * INTO v_enrollment FROM public.enrollments WHERE id = p_enrollment_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Enrollment % not found', p_enrollment_id;
  END IF;

  IF v_enrollment.student_id IS NULL THEN
    RAISE EXCEPTION 'Enrollment % has no student_id', p_enrollment_id;
  END IF;

  -- Step 1: Copy application_payment_schedule → enrollment_payment_schedule
  FOR v_schedule_row IN 
    SELECT * FROM public.application_payment_schedule 
    WHERE application_id = p_application_id
      AND migrated_to_enrollment = false
  LOOP
    INSERT INTO public.enrollment_payment_schedule (
      enrollment_id,
      template_id,
      template_installment_id,
      name,
      amount_cents,
      due_date,
      sequence_order,
      anchor_type,
      anchor_date_used,
      created_at
    )
    VALUES (
      p_enrollment_id,
      v_schedule_row.template_id,
      v_schedule_row.template_installment_id,
      v_schedule_row.name,
      v_schedule_row.amount_cents,
      v_schedule_row.due_date,
      v_schedule_row.sequence_order,
      v_schedule_row.anchor_type,
      v_schedule_row.anchor_date_used,
      v_schedule_row.created_at
    )
    RETURNING id INTO v_enr_schedule_id;

    -- Copy lines for this schedule entry
    FOR v_schedule_line_row IN
      SELECT * FROM public.application_payment_schedule_lines
      WHERE application_payment_schedule_id = v_schedule_row.id
    LOOP
      INSERT INTO public.enrollment_payment_schedule_lines (
        enrollment_payment_schedule_id,
        enrollment_id,
        template_installment_line_id,
        name,
        description,
        amount_cents,
        sequence_order,
        is_commissionable,
        xero_account_code,
        xero_tax_type,
        xero_item_code,
        created_at
      )
      VALUES (
        v_enr_schedule_id,
        p_enrollment_id,
        v_schedule_line_row.template_installment_line_id,
        v_schedule_line_row.name,
        v_schedule_line_row.description,
        v_schedule_line_row.amount_cents,
        v_schedule_line_row.sequence_order,
        v_schedule_line_row.is_commissionable,
        v_schedule_line_row.xero_account_code,
        v_schedule_line_row.xero_tax_type,
        v_schedule_line_row.xero_item_code,
        v_schedule_line_row.created_at
      );
    END LOOP;

    -- Mark as migrated
    UPDATE public.application_payment_schedule
    SET migrated_to_enrollment = true
    WHERE id = v_schedule_row.id;
  END LOOP;

  -- Step 2: Copy application_invoices → enrollment_invoices (all, not just deposits)
  FOR v_app_invoice IN
    SELECT * FROM public.application_invoices
    WHERE application_id = p_application_id
      AND migrated_to_enrollment = false
  LOOP
    -- Generate new invoice number for enrollment invoice
    SELECT public.generate_invoice_number(v_app_invoice.issue_date, extensions.uuid_generate_v4())
    INTO v_invoice_number;

    -- Insert enrollment invoice
    INSERT INTO public.enrollment_invoices (
      enrollment_id,
      rto_id,
      invoice_number,
      status,
      issue_date,
      due_date,
      amount_due_cents,
      amount_paid_cents,
      internal_payment_status,
      pdf_path,
      pdf_generation_status,
      pdf_generation_attempts,
      last_pdf_error,
      pdf_generated_at,
      last_email_sent_at,
      first_overdue_at,
      last_overdue_at,
      notes,
      xero_invoice_id,
      xero_sync_status,
      xero_sync_error,
      xero_synced_at,
      created_at,
      updated_at
    )
    VALUES (
      p_enrollment_id,
      v_app_invoice.rto_id,
      v_invoice_number,
      (CASE 
        WHEN v_app_invoice.amount_paid_cents >= v_app_invoice.amount_due_cents THEN 'PAID'
        WHEN v_app_invoice.status = 'VOID' THEN 'VOID'
        ELSE 'SENT'  -- Migrated invoices become SENT (they were SCHEDULED before)
      END)::invoice_status,
      v_app_invoice.issue_date,
      v_app_invoice.due_date,
      v_app_invoice.amount_due_cents,
      v_app_invoice.amount_paid_cents,
      v_app_invoice.internal_payment_status,
      v_app_invoice.pdf_path,
      v_app_invoice.pdf_generation_status,
      v_app_invoice.pdf_generation_attempts,
      v_app_invoice.last_pdf_error,
      v_app_invoice.pdf_generated_at,
      v_app_invoice.last_email_sent_at,
      v_app_invoice.first_overdue_at,
      v_app_invoice.last_overdue_at,
      v_app_invoice.notes,
      NULL,  -- Reset Xero fields (will sync fresh)
      'pending',
      NULL,
      NULL,
      v_app_invoice.created_at,
      now()
    )
    RETURNING id INTO v_enr_invoice_id;

    v_enrollment_invoices_count := v_enrollment_invoices_count + 1;

    -- Step 3: Copy application_invoice_lines → enrollment_invoice_lines
    FOR v_app_invoice_line IN
      SELECT * FROM public.application_invoice_lines
      WHERE application_invoice_id = v_app_invoice.id
    LOOP
      INSERT INTO public.enrollment_invoice_lines (
        invoice_id,
        name,
        description,
        amount_cents,
        sequence_order,
        is_commissionable,
        xero_account_code,
        xero_tax_type,
        xero_item_code
      )
      VALUES (
        v_enr_invoice_id,
        v_app_invoice_line.name,
        v_app_invoice_line.description,
        v_app_invoice_line.amount_cents,
        v_app_invoice_line.sequence_order,
        v_app_invoice_line.is_commissionable,
        v_app_invoice_line.xero_account_code,
        v_app_invoice_line.xero_tax_type,
        v_app_invoice_line.xero_item_code
      );
    END LOOP;

    -- Step 4: Update payments records
    FOR v_payment IN
      SELECT * FROM public.payments
      WHERE invoice_id = v_app_invoice.id
        AND invoice_type = 'APPLICATION'
    LOOP
      UPDATE public.payments
      SET invoice_id = v_enr_invoice_id,
          invoice_type = 'ENROLLMENT'
      WHERE id = v_payment.id;

      v_payments_migrated_count := v_payments_migrated_count + 1;
    END LOOP;

    -- Mark application invoice as migrated
    UPDATE public.application_invoices
    SET migrated_to_enrollment = true
    WHERE id = v_app_invoice.id;
  END LOOP;

  -- Step 5: Create remaining invoices (non-deposits) as SCHEDULED enrollment invoices
  -- Get template for issue_date_offset_days
  SELECT * INTO v_template 
  FROM public.payment_plan_templates 
  WHERE id = v_enrollment.payment_plan_template_id;

  FOR v_schedule_row IN
    SELECT aps.*, pti.is_deposit
    FROM public.enrollment_payment_schedule eps
    JOIN public.application_payment_schedule aps ON aps.template_installment_id = eps.template_installment_id
    JOIN public.payment_plan_template_installments pti ON pti.id = eps.template_installment_id
    WHERE eps.enrollment_id = p_enrollment_id
      AND aps.application_id = p_application_id
      AND (pti.is_deposit IS NULL OR pti.is_deposit = false)
      AND NOT EXISTS (
        SELECT 1 FROM public.enrollment_invoices ei
        WHERE ei.enrollment_id = p_enrollment_id
          AND ei.due_date = eps.due_date
          AND ei.amount_due_cents = eps.amount_cents
      )
    ORDER BY eps.sequence_order, eps.due_date
  LOOP
    -- Generate invoice number
    SELECT public.generate_invoice_number(v_schedule_row.due_date, extensions.uuid_generate_v4())
    INTO v_invoice_number;

    -- Calculate issue_date from due_date + template offset
    v_issue_date := v_schedule_row.due_date;
    IF v_template.issue_date_offset_days IS NOT NULL THEN
      v_issue_date := v_schedule_row.due_date + (v_template.issue_date_offset_days || ' days')::interval;
    END IF;

    -- Insert enrollment invoice
    INSERT INTO public.enrollment_invoices (
      enrollment_id,
      rto_id,
      invoice_number,
      status,
      issue_date,
      due_date,
      amount_due_cents,
      amount_paid_cents,
      internal_payment_status,
      created_at,
      updated_at
    )
    VALUES (
      p_enrollment_id,
      v_app.rto_id,
      v_invoice_number,
      'SCHEDULED'::invoice_status,
      v_issue_date::date,
      v_schedule_row.due_date,
      v_schedule_row.amount_cents,
      0,
      'UNPAID'::internal_payment_status,
      now(),
      now()
    )
    RETURNING id INTO v_enr_invoice_id;

    v_remaining_invoices_count := v_remaining_invoices_count + 1;

    -- Copy lines from enrollment_payment_schedule_lines
    FOR v_schedule_line_row IN
      SELECT epl.*
      FROM public.enrollment_payment_schedule_lines epl
      JOIN public.enrollment_payment_schedule eps ON eps.id = epl.enrollment_payment_schedule_id
      WHERE eps.enrollment_id = p_enrollment_id
        AND eps.template_installment_id = v_schedule_row.template_installment_id
      ORDER BY epl.sequence_order
    LOOP
      INSERT INTO public.enrollment_invoice_lines (
        invoice_id,
        name,
        description,
        amount_cents,
        sequence_order,
        is_commissionable,
        xero_account_code,
        xero_tax_type,
        xero_item_code
      )
      VALUES (
        v_enr_invoice_id,
        v_schedule_line_row.name,
        v_schedule_line_row.description,
        v_schedule_line_row.amount_cents,
        v_schedule_line_row.sequence_order,
        v_schedule_line_row.is_commissionable,
        v_schedule_line_row.xero_account_code,
        v_schedule_line_row.xero_tax_type,
        v_schedule_line_row.xero_item_code
      );
    END LOOP;
  END LOOP;

  -- Return counts
  RETURN QUERY SELECT 
    v_enrollment_invoices_count,
    v_payments_migrated_count,
    v_remaining_invoices_count;
END;
$$;

COMMENT ON FUNCTION public.migrate_application_invoices_to_enrollment IS 
  'Migrates application invoices and payment schedule to enrollment during approval. Copies all application invoices (not just deposits) and creates remaining non-deposit invoices.';

COMMIT;
