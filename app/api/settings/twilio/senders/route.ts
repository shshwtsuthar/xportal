import { NextRequest } from 'next/server';
import { createClient as createServerSupabase } from '@/lib/supabase/server';

export const runtime = 'nodejs';

function isE164(phone: string): boolean {
  return /^\+\d{6,15}$/.test(phone);
}

export async function GET() {
  try {
    const supabase = await createServerSupabase();
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
      });
    }
    const { data: rtoId, error: rtoErr } = await supabase.rpc('get_my_rto_id');
    if (rtoErr || !rtoId) {
      return new Response(
        JSON.stringify({
          error: 'Unable to resolve RTO',
          details: rtoErr?.message,
        }),
        { status: 400 }
      );
    }
    const { data, error } = await supabase
      .from('twilio_senders')
      .select('*')
      .eq('rto_id', rtoId as string)
      .order('created_at', { ascending: false });
    if (error) {
      return new Response(
        JSON.stringify({
          error: 'Failed to fetch senders',
          details: error.message,
        }),
        { status: 500 }
      );
    }
    return new Response(JSON.stringify(data ?? []), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
}

type CreateSenderPayload = {
  friendly_name: string;
  phone_e164: string;
  channel: 'whatsapp' | 'sms';
  description?: string | null;
  phone_number_sid?: string | null;
  sender_sid?: string | null;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<CreateSenderPayload>;
    const supabase = await createServerSupabase();
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
      });
    }
    const { data: rtoId, error: rtoErr } = await supabase.rpc('get_my_rto_id');
    if (rtoErr || !rtoId) {
      return new Response(
        JSON.stringify({
          error: 'Unable to resolve RTO',
          details: rtoErr?.message,
        }),
        { status: 400 }
      );
    }

    const friendlyName = (body.friendly_name || '').trim();
    const phone = (body.phone_e164 || '').trim();
    const channel = body.channel;
    if (!friendlyName || !phone || !channel) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400 }
      );
    }
    if (!isE164(phone)) {
      return new Response(
        JSON.stringify({ error: 'Phone must be E.164 format' }),
        { status: 400 }
      );
    }
    if (channel !== 'whatsapp' && channel !== 'sms') {
      return new Response(JSON.stringify({ error: 'Invalid channel' }), {
        status: 400,
      });
    }

    const insert = {
      rto_id: rtoId as string,
      friendly_name: friendlyName,
      phone_e164: phone,
      channel,
      description: body.description?.trim?.() || null,
      phone_number_sid: body.phone_number_sid?.trim?.() || null,
      sender_sid: body.sender_sid?.trim?.() || null,
      is_active: true,
    };

    const { data, error } = await supabase
      .from('twilio_senders')
      .insert(insert)
      .select('*')
      .single();
    if (error) {
      const message =
        error.code === '23505'
          ? 'Sender already exists for this channel'
          : error.message;
      return new Response(JSON.stringify({ error: message }), { status: 400 });
    }
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
      status: 201,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
}
