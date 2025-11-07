import { NextRequest } from 'next/server';
import { createClient as createServerSupabase } from '@/lib/supabase/server';

export const runtime = 'nodejs';

function isE164(phone: string): boolean {
  return /^\+\d{6,15}$/.test(phone);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await req.json()) as Record<string, unknown>;
    const supabase = await createServerSupabase();
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
      });
    }

    const updates: Record<string, unknown> = {};
    if (typeof body.friendly_name === 'string') {
      const v = body.friendly_name.trim();
      if (!v)
        return new Response(
          JSON.stringify({ error: 'friendly_name required' }),
          { status: 400 }
        );
      updates.friendly_name = v;
    }
    if (typeof body.phone_e164 === 'string') {
      const v = body.phone_e164.trim();
      if (!isE164(v))
        return new Response(
          JSON.stringify({ error: 'Phone must be E.164 format' }),
          { status: 400 }
        );
      updates.phone_e164 = v;
    }
    if (typeof body.channel === 'string') {
      const v = body.channel;
      if (v !== 'whatsapp' && v !== 'sms') {
        return new Response(JSON.stringify({ error: 'Invalid channel' }), {
          status: 400,
        });
      }
      updates.channel = v;
    }
    if (typeof body.description === 'string') {
      updates.description = body.description.trim() || null;
    }
    if (typeof body.phone_number_sid === 'string') {
      updates.phone_number_sid = body.phone_number_sid.trim() || null;
    }
    if (typeof body.sender_sid === 'string') {
      updates.sender_sid = body.sender_sid.trim() || null;
    }
    if (typeof body.is_active === 'boolean') {
      updates.is_active = body.is_active;
    }

    if (Object.keys(updates).length === 0) {
      return new Response(JSON.stringify({ error: 'No fields to update' }), {
        status: 400,
      });
    }

    const { data, error } = await supabase
      .from('twilio_senders')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();
    if (error) {
      return new Response(
        JSON.stringify({
          error: 'Failed to update sender',
          details: error.message,
        }),
        { status: 400 }
      );
    }
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabase();
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
      });
    }
    const { error } = await supabase
      .from('twilio_senders')
      .delete()
      .eq('id', id);
    if (error) {
      return new Response(
        JSON.stringify({
          error: 'Failed to delete sender',
          details: error.message,
        }),
        { status: 400 }
      );
    }
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
}
