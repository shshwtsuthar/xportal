import { NextRequest } from 'next/server';
import { getTwilioConfigForCurrentUser } from '@/lib/twilio/credentials';
import { createClient as createServerSupabase } from '@/lib/supabase/server';
import twilio from 'twilio';

export const runtime = 'nodejs';

function mapStatus(
  s: string | undefined
):
  | 'queued'
  | 'sending'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'undelivered'
  | 'failed'
  | null {
  switch ((s || '').toLowerCase()) {
    case 'queued':
      return 'queued';
    case 'sending':
      return 'sending';
    case 'sent':
      return 'sent';
    case 'delivered':
      return 'delivered';
    case 'read':
      return 'read';
    case 'undelivered':
      return 'undelivered';
    case 'failed':
      return 'failed';
    default:
      return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const cfg = await getTwilioConfigForCurrentUser();

    // Signature validation if enabled
    if (cfg.validateWebhooks) {
      const sig = req.headers.get('x-twilio-signature') || '';
      const url = `${req.headers.get('x-forwarded-proto') || 'https'}://${req.headers.get('host')}${req.nextUrl.pathname}`;
      const formData = await req.formData();
      const params: Record<string, string> = {};
      for (const [k, v] of formData.entries()) params[k] = String(v);
      const ok = twilio.validateRequest(cfg.authToken, sig, url, params);
      if (!ok)
        return new Response(
          JSON.stringify({ error: 'Invalid Twilio signature' }),
          { status: 403 }
        );

      const sid = params.MessageSid;
      const status = mapStatus(params.MessageStatus);
      if (!sid || !status)
        return new Response(JSON.stringify({ ok: true }), { status: 200 });

      const { data: msg } = await supabase
        .from('whatsapp_messages')
        .select('id')
        .eq('twilio_sid', sid)
        .maybeSingle();
      if (!msg)
        return new Response(JSON.stringify({ ok: true }), { status: 200 });

      await supabase
        .from('whatsapp_messages')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', msg.id);

      await supabase
        .from('whatsapp_message_status_events')
        .insert({
          rto_id: cfg.rtoId,
          message_id: msg.id,
          event: status,
          payload: params,
        });

      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    return new Response(
      JSON.stringify({ ok: true, note: 'Validation disabled' }),
      { status: 200 }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
}
