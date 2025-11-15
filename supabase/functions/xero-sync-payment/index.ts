/// <reference lib="deno.ns" />

//
// XPortal - Xero Payment Sync Edge Function
//
// Syncs a student payment to Xero as a Payment on the corresponding ACCREC invoice.
// This function is called after a payment is recorded in the SMS.
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

interface SyncPaymentRequest {
  paymentId: string;
}

interface SyncPaymentResponse {
  success: boolean;
  xeroPaymentId?: string;
  error?: string;
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

    const { paymentId }: SyncPaymentRequest = await req.json();

    if (!paymentId) {
      return new Response(
        JSON.stringify({ success: false, error: 'paymentId is required' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // 1. Fetch payment with invoice data
    const { data: payment, error: paymentErr } = await supabase
      .from('payments')
      .select(
        'id, invoice_id, rto_id, payment_date, amount_cents, xero_payment_id, xero_sync_status'
      )
      .eq('id', paymentId)
      .single();

    if (paymentErr || !payment) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Payment not found: ${paymentErr?.message}`,
        } as SyncPaymentResponse),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      );
    }

    // 2. Check if already synced (idempotent)
    if (payment.xero_payment_id && payment.xero_sync_status === 'synced') {
      return new Response(
        JSON.stringify({
          success: true,
          xeroPaymentId: payment.xero_payment_id,
        } as SyncPaymentResponse),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // 3. Fetch invoice to get Xero InvoiceID
    const { data: invoice, error: invoiceErr } = await supabase
      .from('invoices')
      .select('id, xero_invoice_id, invoice_number')
      .eq('id', payment.invoice_id)
      .single();

    if (invoiceErr || !invoice) {
      await supabase
        .from('payments')
        .update({
          xero_sync_status: 'failed',
          xero_sync_error: `Invoice not found: ${invoiceErr?.message}`,
        })
        .eq('id', paymentId);

      return new Response(
        JSON.stringify({
          success: false,
          error: `Invoice not found: ${invoiceErr?.message}`,
        } as SyncPaymentResponse),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      );
    }

    // 4. Require that invoice has been synced to Xero
    if (!invoice.xero_invoice_id) {
      await supabase
        .from('payments')
        .update({
          xero_sync_status: 'failed',
          xero_sync_error:
            'Invoice must be synced to Xero before payment can be synced',
        })
        .eq('id', paymentId);

      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invoice must be synced to Xero before payment can be synced',
        } as SyncPaymentResponse),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // 5. Fetch RTO to get default payment account code
    const { data: rto, error: rtoErr } = await supabase
      .from('rtos')
      .select('xero_default_payment_account_code')
      .eq('id', payment.rto_id)
      .single();

    if (rtoErr || !rto) {
      await supabase
        .from('payments')
        .update({
          xero_sync_status: 'failed',
          xero_sync_error: `RTO not found: ${rtoErr?.message}`,
        })
        .eq('id', paymentId);

      return new Response(
        JSON.stringify({
          success: false,
          error: `RTO not found: ${rtoErr?.message}`,
        } as SyncPaymentResponse),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      );
    }

    const accountCode = rto.xero_default_payment_account_code || '101'; // Default to Un-deposited Funds

    // 6. Initialize Xero client
    const xeroClient = new XeroClient(payment.rto_id);

    // 7. Build Xero Payment payload
    const paymentAmount = (payment.amount_cents ?? 0) / 100; // Convert cents to dollars

    const paymentPayload = {
      Payments: [
        {
          Invoice: {
            InvoiceID: invoice.xero_invoice_id,
          },
          Account: {
            Code: accountCode,
          },
          Date: payment.payment_date,
          Amount: paymentAmount,
          Reference: `SMS Payment #${payment.id}`,
          Status: 'AUTHORISED',
        },
      ],
    };

    // 8. Create payment in Xero
    const response = await xeroClient.request('PUT', '/Payments', {
      body: paymentPayload,
    });

    const responseText = await response.text();

    if (!response.ok) {
      const errorMessage = XeroClient.parseError(response, responseText);
      console.error('Xero API error:', errorMessage, responseText);

      // Update payment with error status
      await supabase
        .from('payments')
        .update({
          xero_sync_status: 'failed',
          xero_sync_error: errorMessage.slice(0, 500), // Truncate to reasonable length
        })
        .eq('id', paymentId);

      return new Response(
        JSON.stringify({
          success: false,
          error: errorMessage,
        } as SyncPaymentResponse),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: response.status,
        }
      );
    }

    // 9. Parse response and extract PaymentID
    const responseData = JSON.parse(responseText) as {
      Payments?: Array<{ PaymentID?: string }>;
    };

    const xeroPaymentId =
      responseData.Payments && responseData.Payments.length > 0
        ? responseData.Payments[0].PaymentID
        : null;

    if (!xeroPaymentId) {
      await supabase
        .from('payments')
        .update({
          xero_sync_status: 'failed',
          xero_sync_error: 'Xero returned payment but no PaymentID',
        })
        .eq('id', paymentId);

      return new Response(
        JSON.stringify({
          success: false,
          error: 'Xero returned payment but no PaymentID',
        } as SyncPaymentResponse),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    // 10. Update payment with Xero PaymentID and success status
    const { error: updateErr } = await supabase
      .from('payments')
      .update({
        xero_payment_id: xeroPaymentId,
        xero_sync_status: 'synced',
        xero_synced_at: new Date().toISOString(),
        xero_sync_error: null,
      })
      .eq('id', paymentId);

    if (updateErr) {
      console.error('Failed to update payment with Xero PaymentID:', updateErr);
      // Still return success since Xero payment was created
    }

    return new Response(
      JSON.stringify({
        success: true,
        xeroPaymentId: xeroPaymentId,
      } as SyncPaymentResponse),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in xero-sync-payment:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      } as SyncPaymentResponse),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
