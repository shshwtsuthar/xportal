import { NextRequest } from 'next/server';
import { createClient as createServerSupabase } from '@/lib/supabase/server';
import { sendWhatsAppMessage } from '@/lib/twilio/send';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      senderId: string;
      body?: string;
      templateSid?: string;
      contacts: Array<{ name: string; phone: string }>;
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

    if (!body.senderId)
      return new Response(JSON.stringify({ error: 'senderId required' }), {
        status: 400,
      });
    if (!Array.isArray(body.contacts) || body.contacts.length === 0)
      return new Response(JSON.stringify({ error: 'contacts required' }), {
        status: 400,
      });
    if (!body.body && !body.templateSid)
      return new Response(
        JSON.stringify({ error: 'Provide body or templateSid' }),
        { status: 400 }
      );

    const results = await Promise.all(
      body.contacts.map(async (c) => {
        try {
          const res = await sendWhatsAppMessage({
            rtoId: rtoId as string,
            senderId: body.senderId,
            toE164: c.phone,
            body: body.body || undefined,
            templateSid: body.templateSid || undefined,
          });
          return res.ok
            ? { phone: c.phone, ok: true, sid: res.sid }
            : { phone: c.phone, ok: false, error: res.error };
        } catch (e) {
          return {
            phone: c.phone,
            ok: false,
            error: e instanceof Error ? e.message : String(e),
          };
        }
      })
    );

    return new Response(JSON.stringify({ results }), { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
}
