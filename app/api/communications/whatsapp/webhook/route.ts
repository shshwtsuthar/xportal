import { NextRequest } from 'next/server';
import { getTwilioConfigForCurrentUser } from '@/lib/twilio/credentials';
import { createClient as createServerSupabase } from '@/lib/supabase/server';
import twilio from 'twilio';
import type { TablesInsert } from '@/database.types';

export const runtime = 'nodejs';

function stripWhatsAppPrefix(num: string | undefined) {
  if (!num) return '';
  return num.startsWith('whatsapp:') ? num.replace('whatsapp:', '') : num;
}

function gatherMedia(reqBody: Record<string, string | undefined>): string[] {
  const count = parseInt(reqBody?.NumMedia || '0', 10) || 0;
  const urls: string[] = [];
  for (let i = 0; i < count; i++) {
    const key = `MediaUrl${i}`;
    if (reqBody[key]) urls.push(reqBody[key] as string);
  }
  return urls;
}

function mapStatusForInbound(): 'sent' | 'delivered' {
  // Inbound message into our system: consider delivered to us.
  return 'delivered';
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    // Resolve RTO and optionally validate signature if enabled
    const cfg = await getTwilioConfigForCurrentUser();

    // Optional signature validation
    if (cfg.validateWebhooks) {
      const sig = req.headers.get('x-twilio-signature') || '';
      const url = `${req.headers.get('x-forwarded-proto') || 'https'}://${req.headers.get('host')}${req.nextUrl.pathname}`;
      // Need raw body or parsed object; Next provides parsed for urlencoded if configured. For safety, re-construct params from form data.
      const formData = await req.formData();
      const params: Record<string, string> = {};
      for (const [k, v] of formData.entries()) {
        params[k] = String(v);
      }
      const ok = twilio.validateRequest(cfg.authToken, sig, url, params);
      if (!ok)
        return new Response(
          JSON.stringify({ error: 'Invalid Twilio signature' }),
          { status: 403 }
        );
      // Use params as body after validation
      const body = params;

      const from = stripWhatsAppPrefix(body.From);
      const to = stripWhatsAppPrefix(body.To);
      const profileName = body.ProfileName || null;
      const waId = body.WaId || null;
      const twilioSid = body.MessageSid || null;
      const text = body.Body || null;
      const mediaUrls = gatherMedia(body);

      // Find sender by our "To" number
      const { data: sender } = await supabase
        .from('twilio_senders')
        .select('id, rto_id')
        .eq('rto_id', cfg.rtoId)
        .eq('phone_e164', to)
        .eq('channel', 'whatsapp')
        .maybeSingle();
      if (!sender) {
        return new Response(
          JSON.stringify({ error: 'Sender not registered for this number' }),
          { status: 400 }
        );
      }

      // Upsert thread
      const { data: thread } = await supabase
        .from('whatsapp_threads')
        .upsert(
          {
            rto_id: cfg.rtoId,
            sender_id: sender.id,
            counterparty_e164: from,
            last_message_at: new Date().toISOString(),
            last_dir: 'IN',
            last_status: mapStatusForInbound(),
          },
          { onConflict: 'rto_id,sender_id,counterparty_e164' }
        )
        .select('id')
        .single();

      // Insert message
      const threadId = thread?.id;
      if (!threadId)
        return new Response(JSON.stringify({ error: 'Thread upsert failed' }), {
          status: 500,
        });
      const msgInsert: TablesInsert<'whatsapp_messages'> = {
        rto_id: cfg.rtoId,
        thread_id: threadId,
        sender_id: sender.id,
        direction: 'IN',
        body: text,
        media_urls: mediaUrls,
        status: mapStatusForInbound(),
        twilio_sid: twilioSid || undefined,
        occurred_at: new Date().toISOString(),
      };
      const { error: msgErr } = await supabase
        .from('whatsapp_messages')
        .insert(msgInsert);
      if (msgErr) {
        return new Response(
          JSON.stringify({ error: 'Failed to persist message' }),
          { status: 500 }
        );
      }

      // Log status event
      const lastMsgId = (
        await supabase
          .from('whatsapp_messages')
          .select('id')
          .eq('twilio_sid', twilioSid || '')
          .order('created_at', { ascending: false })
          .limit(1)
      ).data?.[0]?.id;
      if (lastMsgId) {
        const statusInsert: TablesInsert<'whatsapp_message_status_events'> = {
          rto_id: cfg.rtoId,
          message_id: lastMsgId,
          event: mapStatusForInbound(),
          payload: { profileName, waId },
        };
        await supabase
          .from('whatsapp_message_status_events')
          .insert(statusInsert);
      }

      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        note: 'Validation disabled - configure in settings',
      }),
      { status: 200 }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
}
