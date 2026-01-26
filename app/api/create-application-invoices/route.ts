import { NextRequest } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { randomUUID as cryptoRandomUUID } from 'crypto';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { applicationId } = await req.json();

    if (!applicationId) {
      return new Response(
        JSON.stringify({ error: 'applicationId is required' }),
        { status: 400 }
      );
    }

    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SERVICE_ROLE_KEY!
    );

    // Check if application invoices already exist
    const { data: existingInvoices, error: existingErr } = await admin
      .from('application_invoices')
      .select('id')
      .eq('application_id', applicationId)
      .limit(1);

    if (existingErr) {
      console.error(
        '[Create Application Invoices] Error checking existing invoices:',
        existingErr
      );
    }

    if (existingInvoices && existingInvoices.length > 0) {
      console.log(
        '[Create Application Invoices] Application invoices already exist, skipping creation'
      );
      return new Response(
        JSON.stringify({
          message: 'Invoices already exist',
          count: existingInvoices.length,
        }),
        { status: 200 }
      );
    }

    // Get application to get rto_id
    const { data: application, error: appErr } = await admin
      .from('applications')
      .select('rto_id')
      .eq('id', applicationId)
      .single();

    if (appErr || !application) {
      return new Response(JSON.stringify({ error: 'Application not found' }), {
        status: 404,
      });
    }

    // Step 1: Get all payment schedule entries for this application
    const { data: scheduleEntries, error: scheduleErr } = await admin
      .from('application_payment_schedule')
      .select(
        'id, name, amount_cents, due_date, template_installment_id, template_id'
      )
      .eq('application_id', applicationId);

    if (scheduleErr) {
      console.error(
        '[Create Application Invoices] Error fetching payment schedule:',
        scheduleErr
      );
      return new Response(
        JSON.stringify({
          error: `Failed to fetch payment schedule: ${scheduleErr.message}`,
        }),
        { status: 500 }
      );
    }

    if (!scheduleEntries || scheduleEntries.length === 0) {
      console.log(
        '[Create Application Invoices] No payment schedule entries found for application:',
        applicationId
      );
      return new Response(
        JSON.stringify({
          message: 'No payment schedule entries found',
          count: 0,
        }),
        { status: 200 }
      );
    }

    console.log(
      `[Create Application Invoices] Found ${scheduleEntries.length} payment schedule entries`
    );

    // Step 2: Get template info (issue_date_offset_days) - we only need it once
    const templateId = scheduleEntries[0]?.template_id;
    let issueDateOffsetDays = 0;
    if (templateId) {
      const { data: template, error: templateErr } = await admin
        .from('payment_plan_templates')
        .select('issue_date_offset_days')
        .eq('id', templateId)
        .single();

      if (templateErr) {
        console.error(
          '[Create Application Invoices] Error fetching template:',
          templateErr
        );
      } else if (template) {
        issueDateOffsetDays = template.issue_date_offset_days ?? 0;
      }
    }

    // Step 3: Get all installment IDs and check which are deposits
    const installmentIds = scheduleEntries
      .map((s) => s.template_installment_id)
      .filter(Boolean) as string[];

    if (installmentIds.length === 0) {
      console.log(
        '[Create Application Invoices] No template_installment_id found in schedule entries'
      );
      return new Response(
        JSON.stringify({ message: 'No installment IDs found', count: 0 }),
        { status: 200 }
      );
    }

    const { data: installments, error: installmentsErr } = await admin
      .from('payment_plan_template_installments')
      .select('id, is_deposit')
      .in('id', installmentIds);

    if (installmentsErr) {
      console.error(
        '[Create Application Invoices] Error fetching installments:',
        installmentsErr
      );
      return new Response(
        JSON.stringify({
          error: `Failed to fetch installments: ${installmentsErr.message}`,
        }),
        { status: 500 }
      );
    }

    if (!installments || installments.length === 0) {
      console.log(
        '[Create Application Invoices] No installments found for IDs:',
        installmentIds
      );
      return new Response(
        JSON.stringify({ message: 'No installments found', count: 0 }),
        { status: 200 }
      );
    }

    // Step 4: Create a map of installment_id -> is_deposit
    const depositMap = new Map<string, boolean>();
    installments.forEach((inst) => {
      depositMap.set(inst.id, inst.is_deposit === true);
    });

    // Step 5: Filter schedule entries to only deposits
    const deposits = scheduleEntries.filter((sched) => {
      const isDeposit = depositMap.get(sched.template_installment_id);
      return isDeposit === true;
    });

    console.log(
      `[Create Application Invoices] Found ${deposits.length} deposit(s) out of ${scheduleEntries.length} total entries`
    );

    if (deposits.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No deposits found', count: 0 }),
        { status: 200 }
      );
    }

    // Step 6: Create invoices for each deposit
    let createdCount = 0;
    for (const deposit of deposits) {
      // Calculate issue_date
      const dueDate = new Date(deposit.due_date);
      let issueDate = new Date(dueDate);
      issueDate.setDate(issueDate.getDate() + issueDateOffsetDays);
      const today = new Date();
      // Use today if calculated issue date is in the past
      if (issueDate < today) {
        issueDate = today;
      }

      // Generate invoice number
      const seed = cryptoRandomUUID();
      const { data: invoiceNumber, error: invNumErr } = await admin.rpc(
        'generate_application_invoice_number',
        {
          p_created: issueDate.toISOString().slice(0, 10),
          p_uuid: seed,
        }
      );

      if (invNumErr || !invoiceNumber) {
        console.error(
          '[Create Application Invoices] Failed to generate application invoice number:',
          invNumErr
        );
        continue;
      }

      console.log(
        `[Create Application Invoices] Creating application invoice for deposit: ${deposit.name}, amount: ${deposit.amount_cents} cents, invoice_number: ${invoiceNumber}`
      );

      // Create application invoice
      const { data: appInvoice, error: invErr } = await admin
        .from('application_invoices')
        .insert({
          application_id: applicationId,
          rto_id: application.rto_id,
          invoice_number: invoiceNumber,
          status: 'SCHEDULED',
          issue_date: issueDate.toISOString().slice(0, 10),
          due_date: deposit.due_date,
          amount_due_cents: deposit.amount_cents,
          amount_paid_cents: 0,
          internal_payment_status: 'UNPAID',
        })
        .select('id')
        .single();

      if (invErr || !appInvoice) {
        console.error(
          '[Create Application Invoices] Failed to create application invoice:',
          invErr
        );
        continue;
      }

      console.log(
        `[Create Application Invoices] Successfully created application invoice: ${appInvoice.id}`
      );
      createdCount++;

      // Get schedule lines for this deposit
      const { data: scheduleLines, error: linesErr } = await admin
        .from('application_payment_schedule_lines')
        .select('*')
        .eq('application_payment_schedule_id', deposit.id)
        .order('sequence_order', { ascending: true });

      if (linesErr) {
        console.error(
          '[Create Application Invoices] Error fetching schedule lines:',
          linesErr
        );
      }

      if (!linesErr && scheduleLines && scheduleLines.length > 0) {
        // Create invoice lines
        type ScheduleLine = {
          name: string;
          description: string | null;
          amount_cents: number;
          sequence_order: number;
          is_commissionable: boolean;
          xero_account_code: string | null;
          xero_tax_type: string | null;
          xero_item_code: string | null;
        };
        const invoiceLines = scheduleLines.map((line: ScheduleLine) => ({
          application_invoice_id: appInvoice.id,
          name: line.name,
          description: line.description,
          amount_cents: line.amount_cents,
          sequence_order: line.sequence_order,
          is_commissionable: line.is_commissionable,
          xero_account_code: line.xero_account_code,
          xero_tax_type: line.xero_tax_type,
          xero_item_code: line.xero_item_code,
        }));

        const { error: linesInsertErr } = await admin
          .from('application_invoice_lines')
          .insert(invoiceLines);

        if (linesInsertErr) {
          console.error(
            '[Create Application Invoices] Failed to create application invoice lines:',
            linesInsertErr
          );
        } else {
          console.log(
            `[Create Application Invoices] Created ${invoiceLines.length} invoice line(s) for invoice ${appInvoice.id}`
          );
        }
      } else {
        // Create a default line if no schedule lines exist
        const { error: defaultLineErr } = await admin
          .from('application_invoice_lines')
          .insert({
            application_invoice_id: appInvoice.id,
            name: deposit.name || 'Deposit',
            description: null,
            amount_cents: deposit.amount_cents,
            sequence_order: 0,
            is_commissionable: false,
            xero_account_code: null,
            xero_tax_type: null,
            xero_item_code: null,
          });

        if (defaultLineErr) {
          console.error(
            '[Create Application Invoices] Failed to create default invoice line:',
            defaultLineErr
          );
        } else {
          console.log(
            `[Create Application Invoices] Created default invoice line for invoice ${appInvoice.id}`
          );
        }
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Invoices created successfully',
        count: createdCount,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[Create Application Invoices] Error:', msg);
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
}
