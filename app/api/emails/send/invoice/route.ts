import { NextRequest } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { invoiceId, toEmail } = await req.json();
    if (!invoiceId || !toEmail) {
      return new Response(
        JSON.stringify({ error: 'invoiceId and toEmail are required' }),
        { status: 400 }
      );
    }

    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: inv, error } = await admin
      .from('invoices')
      .select(
        'id, rto_id, invoice_number, due_date, amount_due_cents, pdf_path'
      )
      .eq('id', invoiceId)
      .single();
    if (error || !inv) {
      return new Response(JSON.stringify({ error: 'Invoice not found' }), {
        status: 404,
      });
    }

    if (!inv.pdf_path) {
      return new Response(JSON.stringify({ error: 'PDF not generated yet' }), {
        status: 400,
      });
    }

    const { data: signed, error: signErr } = await admin.storage
      .from('invoices')
      .createSignedUrl(inv.pdf_path, 60 * 30);
    if (signErr || !signed?.signedUrl) {
      return new Response(JSON.stringify({ error: 'Failed to sign URL' }), {
        status: 500,
      });
    }

    // Delegate actual email send to frontend email provider (Resend used in scheduled job).
    // Here we just return a signed URL for UI to use if needed.
    return new Response(JSON.stringify({ downloadUrl: signed.signedUrl }), {
      status: 200,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
}
