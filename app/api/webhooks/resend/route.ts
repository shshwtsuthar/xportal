import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { Webhook } from 'svix';
import type { Database, Json } from '@/database.types';

export const runtime = 'nodejs';

const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;

type ResendWebhook = {
  type: string; // e.g., "email.sent", "email.delivered", "email.bounced", "email.complained"
  created_at?: string;
  data?: {
    email_id?: string; // Resend message ID
    to?: string[];
    subject?: string;
    bounce?: { message?: string } | null;
    [key: string]: unknown;
  };
};

const EVENT_STATUS_MAP: Record<
  string,
  'SENT' | 'DELIVERED' | 'FAILED' | 'BOUNCED' | 'COMPLAINED' | null
> = {
  'email.sent': 'SENT',
  'email.delivered': 'DELIVERED',
  'email.bounced': 'BOUNCED',
  'email.complained': 'COMPLAINED',
  'email.delivery_delayed': null,
  'email.opened': null,
  'email.clicked': null,
};

export async function POST(req: NextRequest) {
  try {
    if (!webhookSecret) {
      return new Response(
        JSON.stringify({ error: 'Webhook secret not configured' }),
        { status: 500 }
      );
    }

    // Get raw body text (required for signature verification)
    const payload = await req.text();

    // Extract Svix headers for signature verification
    const svixId = req.headers.get('svix-id');
    const svixTimestamp = req.headers.get('svix-timestamp');
    const svixSignature = req.headers.get('svix-signature');

    if (!svixId || !svixTimestamp || !svixSignature) {
      return new Response(JSON.stringify({ error: 'Missing Svix headers' }), {
        status: 400,
      });
    }

    // Verify webhook signature using Svix
    // Resend uses Svix for webhook verification
    let body: ResendWebhook;
    try {
      if (!webhookSecret) {
        return new Response(
          JSON.stringify({ error: 'Webhook secret not configured' }),
          { status: 500 }
        );
      }
      const wh = new Webhook(webhookSecret);
      const headers: Record<string, string> = {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
      };
      const result = wh.verify(payload, headers) as unknown as ResendWebhook;
      body = result;
    } catch (verifyError) {
      return new Response(
        JSON.stringify({
          error: 'Invalid webhook signature',
          details: (verifyError as Error).message,
        }),
        { status: 401 }
      );
    }
    const eventType = body?.type;
    const mapped = EVENT_STATUS_MAP[eventType ?? ''] ?? null;
    const emailId = body?.data?.email_id;

    if (!eventType || !emailId) {
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    const admin = createAdminClient();

    // Find message by resend_message_id
    const { data: msg, error: findErr } = await admin
      .from('email_messages')
      .select('id')
      .eq('resend_message_id', emailId)
      .limit(1)
      .maybeSingle();

    if (findErr || !msg) {
      // Unknown message id; acknowledge to avoid retries
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    // Insert event row first
    const eventPayload = body;
    if (mapped) {
      // Update status fields
      const updates: {
        status: 'SENT' | 'DELIVERED' | 'FAILED' | 'BOUNCED' | 'COMPLAINED';
        status_updated_at: string;
        delivered_at?: string;
        failed_at?: string;
        error_message?: string;
      } = {
        status: mapped,
        status_updated_at: new Date().toISOString(),
      };
      if (mapped === 'DELIVERED')
        updates['delivered_at'] = new Date().toISOString();
      if (mapped === 'FAILED') updates['failed_at'] = new Date().toISOString();
      if (mapped === 'BOUNCED') {
        updates['failed_at'] = new Date().toISOString();
        if (body?.data?.bounce?.message)
          updates['error_message'] = body.data.bounce.message;
      }

      await admin.from('email_messages').update(updates).eq('id', msg.id);

      // Convert eventPayload to Json type (recursive JSON structure)
      const payloadJson: Json = JSON.parse(
        JSON.stringify(eventPayload)
      ) as Json;

      await admin.from('email_message_status_events').insert({
        email_message_id: msg.id,
        event_type: mapped,
        payload: payloadJson,
      });
    } else {
      // Non-status events we track are ignored for now; acknowledge
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
}
