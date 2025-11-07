import { NextRequest } from 'next/server';
import { createClient as createServerSupabase } from '@/lib/supabase/server';
import { sendWhatsAppMessage } from '@/lib/twilio/send';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      senderId?: string;
      toE164?: string;
      body?: string;
      threadId?: string;
    };
    const supabase = await createServerSupabase();
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes?.user)
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
      });
    const { data: rtoId, error: rtoErr } = await supabase.rpc('get_my_rto_id');
    if (rtoErr || !rtoId)
      return new Response(JSON.stringify({ error: 'Unable to resolve RTO' }), {
        status: 400,
      });

    let to = body.toE164;
    // If threadId provided, resolve counterparty from thread
    if (!to && body.threadId) {
      const { data: thread } = await supabase
        .from('whatsapp_threads')
        .select('counterparty_e164')
        .eq('id', body.threadId)
        .maybeSingle();
      to = thread?.counterparty_e164;
    }
    if (!to)
      return new Response(JSON.stringify({ error: 'Destination required' }), {
        status: 400,
      });
    if (!body.senderId)
      return new Response(JSON.stringify({ error: 'senderId required' }), {
        status: 400,
      });
    if (!body.body?.trim())
      return new Response(JSON.stringify({ error: 'Message body required' }), {
        status: 400,
      });

    const result = await sendWhatsAppMessage({
      rtoId: rtoId as string,
      senderId: body.senderId,
      toE164: to,
      body: body.body.trim(),
    });
    return new Response(JSON.stringify(result), { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
    });
  }
}
