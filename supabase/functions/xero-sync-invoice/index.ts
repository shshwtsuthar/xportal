/// <reference lib="deno.ns" />

//
// XPortal - Xero Invoice Sync Edge Function
//
// Syncs a student invoice to Xero as an ACCREC (Accounts Receivable) invoice.
// This function is called when an invoice status changes to SENT or during batch sync.
//

import { serve } from 'std/http/server.ts';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../_shared/database.types.ts';
import { XeroClient } from '../_shared/xero-client.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

type Db = Database;

interface SyncInvoiceRequest {
  invoiceId: string;
}

interface SyncInvoiceResponse {
  success: boolean;
  xeroInvoiceId?: string;
  error?: string;
}

/**
 * Formats a date value to YYYY-MM-DD format for Xero API.
 * Handles string dates, Date objects, and ensures proper format.
 */
function formatDateForXero(date: string | Date | null): string {
  if (!date) throw new Error('Date is required');
  if (typeof date === 'string') {
    // Already a string, ensure YYYY-MM-DD format (remove time portion if present)
    return date.split('T')[0];
  }
  // Date object
  return date.toISOString().split('T')[0];
}

/**
 * Truncates a string to a maximum length.
 */
function truncateString(str: string, maxLength: number): string {
  return str.length > maxLength ? str.substring(0, maxLength) : str;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Use service role client to bypass RLS
    const supabase = createClient<Db>(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { invoiceId }: SyncInvoiceRequest = await req.json();

    if (!invoiceId) {
      return new Response(
        JSON.stringify({ success: false, error: 'invoiceId is required' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // 1. Fetch invoice with related data
    const { data: invoice, error: invoiceErr } = await supabase
      .from('invoices')
      .select(
        'id, rto_id, enrollment_id, invoice_number, issue_date, due_date, amount_due_cents, xero_invoice_id, xero_sync_status'
      )
      .eq('id', invoiceId)
      .single();

    if (invoiceErr || !invoice) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Invoice not found: ${invoiceErr?.message}`,
        } as SyncInvoiceResponse),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      );
    }

    // 2. Check if already synced (idempotent)
    if (invoice.xero_invoice_id && invoice.xero_sync_status === 'synced') {
      return new Response(
        JSON.stringify({
          success: true,
          xeroInvoiceId: invoice.xero_invoice_id,
        } as SyncInvoiceResponse),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // 3. Fetch enrollment, student, program, and payment plan template
    const { data: enrollment, error: enrollErr } = await supabase
      .from('enrollments')
      .select('id, student_id, program_id, payment_plan_template_id')
      .eq('id', invoice.enrollment_id)
      .single();

    if (enrollErr || !enrollment) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Enrollment not found: ${enrollErr?.message}`,
        } as SyncInvoiceResponse),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      );
    }

    const { data: student, error: studentErr } = await supabase
      .from('students')
      .select('id, xero_contact_id, first_name, last_name')
      .eq('id', enrollment.student_id)
      .single();

    if (studentErr || !student) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Student not found: ${studentErr?.message}`,
        } as SyncInvoiceResponse),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      );
    }

    // 4. Ensure student has Xero contact (sync if missing)
    if (!student.xero_contact_id) {
      // Call xero-sync-contact function
      const syncContactUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/xero-sync-contact`;
      const syncContactResponse = await fetch(syncContactUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
        },
        body: JSON.stringify({ studentId: student.id }),
      });

      if (!syncContactResponse.ok) {
        const errorText = await syncContactResponse.text();
        return new Response(
          JSON.stringify({
            success: false,
            error: `Failed to sync student contact: ${errorText}`,
          } as SyncInvoiceResponse),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
          }
        );
      }

      // Re-fetch student to get updated xero_contact_id
      const { data: updatedStudent } = await supabase
        .from('students')
        .select('xero_contact_id')
        .eq('id', student.id)
        .single();

      if (!updatedStudent?.xero_contact_id) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Student contact synced but ContactID not found',
          } as SyncInvoiceResponse),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
          }
        );
      }
      student.xero_contact_id = updatedStudent.xero_contact_id;
    }

    // Validate that we have a contact ID
    if (!student.xero_contact_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            'Student does not have a Xero contact ID. Please sync contact first.',
        } as SyncInvoiceResponse),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // 5. Fetch program name for line item description
    const { data: program } = await supabase
      .from('programs')
      .select('name')
      .eq('id', enrollment.program_id)
      .single();

    // 6. Fetch payment plan template for accounting mappings
    const { data: template } = await supabase
      .from('payment_plan_templates')
      .select('xero_account_code, xero_tax_type, xero_item_code')
      .eq('id', enrollment.payment_plan_template_id)
      .single();

    // 7. Determine installment sequence/name from application_payment_schedule
    // Match invoice by due_date to find the installment name
    const { data: paymentSchedule } = await supabase
      .from('application_payment_schedule')
      .select('name, sequence_order')
      .eq('due_date', invoice.due_date)
      .limit(1)
      .maybeSingle();

    const installmentName = paymentSchedule?.name || 'Installment';
    const programName = program?.name || 'Course';

    // 8. Initialize Xero client
    const xeroClient = new XeroClient(invoice.rto_id);

    // 9. Build Xero Invoice payload
    // Ensure exactly 2 decimal places for monetary values
    const invoiceAmount = Number(
      ((invoice.amount_due_cents ?? 0) / 100).toFixed(2)
    );

    // Format dates to YYYY-MM-DD format
    const issueDate = formatDateForXero(invoice.issue_date);
    const dueDate = formatDateForXero(invoice.due_date);

    // Build description and reference with length validation
    const description = truncateString(
      `${programName} - ${installmentName}`,
      4000
    );
    const reference = truncateString(
      `SMS Invoice #${invoice.invoice_number}`,
      255
    );

    // Build line item
    // Note: TaxType is intentionally omitted - Xero will use the default tax code
    // for the account. TaxType can be added later once valid tax types for the
    // organization are determined.
    const lineItem: {
      Description: string;
      Quantity: number;
      UnitAmount: number;
      AccountCode: string;
      ItemCode?: string;
    } = {
      Description: description,
      Quantity: 1.0,
      UnitAmount: invoiceAmount,
      AccountCode: template?.xero_account_code || '200',
    };

    // Add ItemCode if provided
    if (template?.xero_item_code) {
      lineItem.ItemCode = template.xero_item_code;
    }

    const invoicePayload = {
      Invoices: [
        {
          Type: 'ACCREC',
          Contact: {
            ContactID: student.xero_contact_id,
          },
          Date: issueDate,
          DueDate: dueDate,
          Reference: reference,
          Status: 'AUTHORISED',
          CurrencyCode: 'AUD',
          InvoiceNumber: invoice.invoice_number,
          LineItems: [lineItem],
        },
      ],
    };

    // 10. Create invoice in Xero
    const response = await xeroClient.request('POST', '/Invoices', {
      body: invoicePayload,
    });

    const responseText = await response.text();

    if (!response.ok) {
      const errorMessage = XeroClient.parseError(response, responseText);
      console.error('Xero API error:', errorMessage, responseText);

      // Update invoice with error status
      await supabase
        .from('invoices')
        .update({
          xero_sync_status: 'failed',
          xero_sync_error: errorMessage.slice(0, 500), // Truncate to reasonable length
        })
        .eq('id', invoiceId);

      return new Response(
        JSON.stringify({
          success: false,
          error: errorMessage,
        } as SyncInvoiceResponse),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: response.status,
        }
      );
    }

    // 11. Parse response and extract InvoiceID
    const responseData = JSON.parse(responseText) as {
      Invoices?: Array<{ InvoiceID?: string }>;
    };

    const xeroInvoiceId =
      responseData.Invoices && responseData.Invoices.length > 0
        ? responseData.Invoices[0].InvoiceID
        : null;

    if (!xeroInvoiceId) {
      await supabase
        .from('invoices')
        .update({
          xero_sync_status: 'failed',
          xero_sync_error: 'Xero returned invoice but no InvoiceID',
        })
        .eq('id', invoiceId);

      return new Response(
        JSON.stringify({
          success: false,
          error: 'Xero returned invoice but no InvoiceID',
        } as SyncInvoiceResponse),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    // 12. Update invoice with Xero InvoiceID and success status
    const { error: updateErr } = await supabase
      .from('invoices')
      .update({
        xero_invoice_id: xeroInvoiceId,
        xero_sync_status: 'synced',
        xero_synced_at: new Date().toISOString(),
        xero_sync_error: null,
      })
      .eq('id', invoiceId);

    if (updateErr) {
      console.error('Failed to update invoice with Xero InvoiceID:', updateErr);
      // Still return success since Xero invoice was created
    }

    return new Response(
      JSON.stringify({
        success: true,
        xeroInvoiceId: xeroInvoiceId,
      } as SyncInvoiceResponse),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in xero-sync-invoice:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      } as SyncInvoiceResponse),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
