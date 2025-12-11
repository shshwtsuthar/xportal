/// <reference lib="deno.ns" />

//
// XPortal - Xero Invoice Batch Sync Edge Function
//
// Syncs multiple invoices to Xero in batch. Processes invoices with status SENT
// that haven't been synced yet (xero_sync_status is 'pending' or NULL).
// Respects Xero rate limits (60 requests/minute).
//

import { serve } from 'std/http/server.ts';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../_shared/database.types.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

type Db = Database;

interface BatchSyncResponse {
  success: boolean;
  processed: number;
  succeeded: number;
  failed: number;
  errors?: string[];
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

    // 1. Query invoices that need syncing
    // Status must be SENT, and xero_sync_status must be 'pending' or NULL
    const { data: invoices, error: invoicesErr } = await supabase
      .from('invoices')
      .select('id, rto_id')
      .eq('status', 'SENT')
      .or('xero_sync_status.is.null,xero_sync_status.eq.pending')
      .limit(100); // Process up to 100 at a time to respect rate limits

    if (invoicesErr) {
      return new Response(
        JSON.stringify({
          success: false,
          processed: 0,
          succeeded: 0,
          failed: 0,
          errors: [invoicesErr.message],
        } as BatchSyncResponse),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    if (!invoices || invoices.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          processed: 0,
          succeeded: 0,
          failed: 0,
        } as BatchSyncResponse),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // 2. Call xero-sync-invoice for each invoice
    const syncUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/xero-sync-invoice`;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    let succeeded = 0;
    let failed = 0;
    const errors: string[] = [];

    // Process with rate limiting: max 5 concurrent requests, then wait
    const batchSize = 5;
    const delayBetweenBatches = 1000; // 1 second between batches

    for (let i = 0; i < invoices.length; i += batchSize) {
      const batch = invoices.slice(i, i + batchSize);

      // Process batch concurrently
      const batchPromises = batch.map(async (invoice) => {
        try {
          const response = await fetch(syncUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${anonKey}`,
            },
            body: JSON.stringify({ invoiceId: invoice.id }),
          });

          const result = await response.json();
          if (response.ok && result.success) {
            succeeded++;
            return { success: true, invoiceId: invoice.id };
          } else {
            failed++;
            const errorMsg = result.error || `HTTP ${response.status}`;
            errors.push(`Invoice ${invoice.id}: ${errorMsg}`);
            return { success: false, invoiceId: invoice.id, error: errorMsg };
          }
        } catch (error) {
          failed++;
          const errorMsg =
            error instanceof Error ? error.message : String(error);
          errors.push(`Invoice ${invoice.id}: ${errorMsg}`);
          return { success: false, invoiceId: invoice.id, error: errorMsg };
        }
      });

      await Promise.all(batchPromises);

      // Wait between batches to respect rate limits
      // Xero allows 60 requests/minute, so ~1 request/second is safe
      if (i + batchSize < invoices.length) {
        await new Promise((resolve) =>
          setTimeout(resolve, delayBetweenBatches)
        );
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: invoices.length,
        succeeded,
        failed,
        ...(errors.length > 0 ? { errors: errors.slice(0, 10) } : {}), // Limit error output
      } as BatchSyncResponse),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in xero-sync-invoices-batch:', error);
    return new Response(
      JSON.stringify({
        success: false,
        processed: 0,
        succeeded: 0,
        failed: 0,
        errors: [error instanceof Error ? error.message : String(error)],
      } as BatchSyncResponse),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
