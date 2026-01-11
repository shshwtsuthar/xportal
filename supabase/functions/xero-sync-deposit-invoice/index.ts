/// <reference lib="deno.ns" />

//
// XPortal - Xero Deposit Invoice Sync Edge Function
//
// Syncs a deposit invoice to Xero as an ACCREC (Accounts Receivable) invoice.
// Deposits are invoices that must be paid before application acceptance.
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

interface SyncDepositInvoiceRequest {
  depositInvoiceId: string;
}

interface SyncDepositInvoiceResponse {
  success: boolean;
  xeroInvoiceId?: string;
  error?: string;
}

/**
 * Formats a date value to YYYY-MM-DD format for Xero API.
 */
function formatDateForXero(date: string | Date | null): string {
  if (!date) throw new Error('Date is required');
  if (typeof date === 'string') {
    return date.split('T')[0];
  }
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
      Deno.env.get('SERVICE_ROLE_KEY') ?? ''
    );

    const { depositInvoiceId }: SyncDepositInvoiceRequest = await req.json();

    if (!depositInvoiceId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'depositInvoiceId is required',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // 1. Fetch deposit invoice with related data
    const { data: depositInvoice, error: depositErr } = await supabase
      .from('application_deposit_invoices')
      .select('*')
      .eq('id', depositInvoiceId)
      .single();

    if (depositErr || !depositInvoice) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Deposit invoice not found: ${depositErr?.message}`,
        } as SyncDepositInvoiceResponse),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      );
    }

    // 2. Check if already synced (idempotent)
    if (
      depositInvoice.xero_invoice_id &&
      depositInvoice.xero_sync_status === 'synced'
    ) {
      return new Response(
        JSON.stringify({
          success: true,
          xeroInvoiceId: depositInvoice.xero_invoice_id,
        } as SyncDepositInvoiceResponse),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // 3. Fetch application and applicant details
    const { data: application, error: appErr } = await supabase
      .from('applications')
      .select('id, first_name, last_name, email, rto_id')
      .eq('id', depositInvoice.application_id)
      .single();

    if (appErr || !application) {
      await supabase
        .from('application_deposit_invoices')
        .update({
          xero_sync_status: 'failed',
          xero_sync_error: 'Application not found',
        })
        .eq('id', depositInvoiceId);

      return new Response(
        JSON.stringify({
          success: false,
          error: 'Application not found',
        } as SyncDepositInvoiceResponse),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      );
    }

    // 4. Fetch RTO to get Xero credentials
    const { data: rto, error: rtoErr } = await supabase
      .from('rtos')
      .select('id, name, xero_tenant_id, xero_refresh_token')
      .eq('id', application.rto_id)
      .single();

    if (rtoErr || !rto || !rto.xero_tenant_id || !rto.xero_refresh_token) {
      await supabase
        .from('application_deposit_invoices')
        .update({
          xero_sync_status: 'failed',
          xero_sync_error: 'RTO Xero credentials not configured',
        })
        .eq('id', depositInvoiceId);

      return new Response(
        JSON.stringify({
          success: false,
          error: 'RTO Xero credentials not configured',
        } as SyncDepositInvoiceResponse),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // 5. Initialize Xero client
    const xeroClient = new XeroClient(
      rto.xero_refresh_token,
      rto.xero_tenant_id
    );
    await xeroClient.refreshAccessToken();

    // 6. Check or create contact in Xero for the applicant
    const applicantName =
      `${application.first_name || ''} ${application.last_name || ''}`.trim() ||
      'Unknown Applicant';
    const applicantEmail = application.email || '';

    // Search for existing contact
    let contactId: string | null = null;
    if (applicantEmail) {
      const searchResponse = await xeroClient.request(
        'GET',
        `/Contacts?where=EmailAddress%3D%3D%22${encodeURIComponent(applicantEmail)}%22`
      );
      const searchData = JSON.parse(await searchResponse.text());
      if (searchData.Contacts && searchData.Contacts.length > 0) {
        contactId = searchData.Contacts[0].ContactID;
      }
    }

    // Create contact if not found
    if (!contactId) {
      const contactPayload = {
        Contacts: [
          {
            Name: truncateString(applicantName, 255),
            EmailAddress: applicantEmail || undefined,
            ContactStatus: 'ACTIVE',
          },
        ],
      };

      const createResponse = await xeroClient.request('POST', '/Contacts', {
        body: contactPayload,
      });

      const createData = JSON.parse(await createResponse.text());
      if (createData.Contacts && createData.Contacts.length > 0) {
        contactId = createData.Contacts[0].ContactID;
      }

      if (!contactId) {
        throw new Error('Failed to create or find Xero contact');
      }
    }

    // 7. Prepare Xero invoice
    const issueDate = formatDateForXero(depositInvoice.issue_date);
    const dueDate = formatDateForXero(depositInvoice.due_date);
    const reference = `Deposit - ${depositInvoice.name}`;

    const xeroLineItems = [
      {
        Description: truncateString(depositInvoice.name, 4000),
        Quantity: 1,
        UnitAmount: (depositInvoice.amount_due_cents / 100).toFixed(2),
        AccountCode: '200', // Default revenue account
        TaxType: 'OUTPUT2', // GST on Income (adjust as needed)
      },
    ];

    const invoicePayload = {
      Invoices: [
        {
          Type: 'ACCREC',
          Contact: {
            ContactID: contactId,
          },
          Date: issueDate,
          DueDate: dueDate,
          Reference: reference,
          Status: 'AUTHORISED',
          CurrencyCode: 'AUD',
          InvoiceNumber: depositInvoice.invoice_number,
          LineItems: xeroLineItems,
        },
      ],
    };

    // 8. Create invoice in Xero
    const response = await xeroClient.request('POST', '/Invoices', {
      body: invoicePayload,
    });

    const responseText = await response.text();

    if (!response.ok) {
      const errorMessage = XeroClient.parseError(response, responseText);
      console.error('Xero API error:', errorMessage, responseText);

      // Update deposit invoice with error status
      await supabase
        .from('application_deposit_invoices')
        .update({
          xero_sync_status: 'failed',
          xero_sync_error: errorMessage.slice(0, 500),
        })
        .eq('id', depositInvoiceId);

      return new Response(
        JSON.stringify({
          success: false,
          error: errorMessage,
        } as SyncDepositInvoiceResponse),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: response.status,
        }
      );
    }

    // 9. Parse response and extract InvoiceID
    const responseData = JSON.parse(responseText) as {
      Invoices?: Array<{ InvoiceID?: string }>;
    };

    const xeroInvoiceId =
      responseData.Invoices && responseData.Invoices.length > 0
        ? responseData.Invoices[0].InvoiceID
        : null;

    if (!xeroInvoiceId) {
      await supabase
        .from('application_deposit_invoices')
        .update({
          xero_sync_status: 'failed',
          xero_sync_error: 'No InvoiceID returned from Xero',
        })
        .eq('id', depositInvoiceId);

      return new Response(
        JSON.stringify({
          success: false,
          error: 'No InvoiceID returned from Xero',
        } as SyncDepositInvoiceResponse),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    // 10. Update deposit invoice with Xero details
    await supabase
      .from('application_deposit_invoices')
      .update({
        xero_invoice_id: xeroInvoiceId,
        xero_sync_status: 'synced',
        xero_sync_error: null,
      })
      .eq('id', depositInvoiceId);

    // 11. Update RTO's refresh token if it changed
    const newRefreshToken = xeroClient.getRefreshToken();
    if (newRefreshToken && newRefreshToken !== rto.xero_refresh_token) {
      await supabase
        .from('rtos')
        .update({ xero_refresh_token: newRefreshToken })
        .eq('id', rto.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        xeroInvoiceId,
      } as SyncDepositInvoiceResponse),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error syncing deposit invoice to Xero:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      } as SyncDepositInvoiceResponse),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
