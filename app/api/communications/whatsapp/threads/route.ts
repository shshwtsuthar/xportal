import { NextRequest } from 'next/server';
import { createClient as createServerSupabase } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
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
    const url = new URL(req.url);
    const senderId = url.searchParams.get('senderId');
    if (!senderId)
      return new Response(JSON.stringify({ error: 'senderId required' }), {
        status: 400,
      });

    const { data, error } = await supabase
      .from('whatsapp_threads')
      .select(
        'id, rto_id, sender_id, counterparty_e164, last_message_at, last_dir, last_status'
      )
      .eq('rto_id', rtoId as string)
      .eq('sender_id', senderId)
      .order('last_message_at', { ascending: false });
    if (error)
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
      });

    // Optionally derive last_preview by looking up last message per thread (cheap approach: skip for now)
    return new Response(JSON.stringify(data || []), { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
}
