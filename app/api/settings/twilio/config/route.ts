import { NextRequest } from 'next/server';
import { createClient as createServerSupabase } from '@/lib/supabase/server';
import { encryptSecret, maskToken } from '@/lib/utils/crypto';
import type { TablesInsert, TablesUpdate } from '@/database.types';

export const runtime = 'nodejs';

type UpsertConfigPayload = {
  account_sid?: string;
  auth_token?: string; // write-only
  messaging_service_sid?: string | null;
  validate_webhooks?: boolean;
};

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
      .from('twilio_settings')
      .select(
        'account_sid, auth_token_masked, messaging_service_sid, validate_webhooks'
      )
      .eq('rto_id', rtoId as string)
      .maybeSingle();
    if (error) {
      return new Response(
        JSON.stringify({
          error: 'Failed to fetch settings',
          details: error.message,
        }),
        { status: 500 }
      );
    }
    return new Response(
      JSON.stringify({
        account_sid: data?.account_sid ?? null,
        messaging_service_sid: data?.messaging_service_sid ?? null,
        validate_webhooks: data?.validate_webhooks ?? true,
        auth_token_masked: data?.auth_token_masked ?? null,
        has_token: Boolean(data?.auth_token_masked),
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const input = (await req.json()) as UpsertConfigPayload;
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

    const updates: Record<string, unknown> = { rto_id: rtoId as string };

    if (
      typeof input.account_sid === 'string' &&
      input.account_sid.trim().length > 0
    ) {
      updates.account_sid = input.account_sid.trim();
    }

    if (typeof input.messaging_service_sid !== 'undefined') {
      updates.messaging_service_sid = input.messaging_service_sid || null;
    }

    if (typeof input.validate_webhooks === 'boolean') {
      updates.validate_webhooks = input.validate_webhooks;
    }

    if (
      typeof input.auth_token === 'string' &&
      input.auth_token.trim().length > 0
    ) {
      const encKey = process.env.TWILIO_CFG_ENC_KEY;
      if (!encKey) {
        return new Response(
          JSON.stringify({
            error: 'Missing server encryption key TWILIO_CFG_ENC_KEY',
          }),
          { status: 500 }
        );
      }
      const cipher = encryptSecret(input.auth_token.trim(), encKey);
      updates.auth_token_cipher = cipher;
      updates.auth_token_masked = maskToken(input.auth_token.trim());
    }

    if (
      !updates.account_sid &&
      !updates.auth_token_cipher &&
      typeof updates.messaging_service_sid === 'undefined' &&
      typeof updates.validate_webhooks === 'undefined'
    ) {
      return new Response(JSON.stringify({ error: 'No fields to update' }), {
        status: 400,
      });
    }

    const { data: existing } = await supabase
      .from('twilio_settings')
      .select('id')
      .eq('rto_id', rtoId as string)
      .maybeSingle();

    let resp;
    if (existing?.id) {
      resp = await supabase
        .from('twilio_settings')
        .update(updates as TablesUpdate<'twilio_settings'>)
        .eq('id', existing.id)
        .select(
          'account_sid, auth_token_masked, messaging_service_sid, validate_webhooks'
        )
        .single();
    } else {
      resp = await supabase
        .from('twilio_settings')
        .insert(updates as TablesInsert<'twilio_settings'>)
        .select(
          'account_sid, auth_token_masked, messaging_service_sid, validate_webhooks'
        )
        .single();
    }

    if (resp.error) {
      return new Response(
        JSON.stringify({
          error: 'Failed to save settings',
          details: resp.error.message,
        }),
        { status: 500 }
      );
    }

    return new Response(JSON.stringify(resp.data), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
}
