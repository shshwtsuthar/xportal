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
    const threadId = url.searchParams.get('threadId');
    if (!threadId)
      return new Response(JSON.stringify({ error: 'threadId required' }), {
        status: 400,
      });

    const { data, error } = await supabase
      .from('whatsapp_messages')
      .select(
        'id, thread_id, sender_id, direction, body, media_urls, status, occurred_at'
      )
      .eq('thread_id', threadId)
      .order('occurred_at', { ascending: true });
    if (error)
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
      });
    return new Response(JSON.stringify(data || []), { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
}
