import { makeTwilioClient, selectFrom } from './client';
import { createClient as createServerSupabase } from '@/lib/supabase/server';
import type { TablesInsert } from '@/database.types';

type MessageCreatePayload = {
  to: string;
  from?: string;
  messagingServiceSid?: string;
  body?: string;
  mediaUrl?: string[];
  contentSid?: string;
  contentVariables?: string;
};

export type SendWhatsAppInput = {
  rtoId: string;
  senderId?: string | null;
  toE164: string;
  body?: string | null;
  mediaUrls?: string[] | null;
  templateSid?: string | null;
  templateParams?: Record<string, string> | null;
};

export type SendResult =
  | { ok: true; sid: string }
  | { ok: false; error: string };

export async function sendWhatsAppMessage(
  input: SendWhatsAppInput
): Promise<SendResult> {
  const {
    rtoId,
    senderId,
    toE164,
    body,
    mediaUrls,
    templateSid,
    templateParams,
  } = input;
  if (!body && !templateSid) {
    throw new Error('Either body or templateSid is required');
  }

  const supabase = await createServerSupabase();
  const client = await makeTwilioClient(rtoId);
  const fromSel = await selectFrom(rtoId, { senderId: senderId || null });

  // Find/create thread for logging
  const senderRow = await supabase
    .from('twilio_senders')
    .select('id')
    .eq('id', senderId as string)
    .maybeSingle();
  const senderPk = senderRow.data?.id || null;
  if (!senderPk && !fromSel.messagingServiceSid) {
    throw new Error(
      'Sender is required when Messaging Service SID is not configured'
    );
  }
  const { data: thread } = await supabase
    .from('whatsapp_threads')
    .upsert(
      {
        rto_id: rtoId,
        sender_id: senderPk!,
        counterparty_e164: toE164,
        last_message_at: new Date().toISOString(),
        last_dir: 'OUT',
        last_status: 'queued',
      },
      { onConflict: 'rto_id,sender_id,counterparty_e164' }
    )
    .select('id')
    .single();

  const threadId = thread?.id as string | undefined;
  if (!threadId) return { ok: false, error: 'Thread upsert failed' };

  const msgInsert: TablesInsert<'whatsapp_messages'> = {
    rto_id: rtoId,
    thread_id: threadId,
    sender_id: senderPk!,
    direction: 'OUT' as const,
    body: body || null,
    media_urls: mediaUrls || [],
    status: 'queued' as const,
    occurred_at: new Date().toISOString(),
  };

  const { data: msg } = await supabase
    .from('whatsapp_messages')
    .insert(msgInsert)
    .select('id')
    .single();

  try {
    const payload: MessageCreatePayload = {
      to: `whatsapp:${toE164}`,
    };
    if (fromSel.messagingServiceSid) {
      payload.messagingServiceSid = fromSel.messagingServiceSid;
    } else if (fromSel.from) {
      payload.from = fromSel.from;
    }
    if (templateSid) {
      // Twilio Content API template send
      payload.contentSid = templateSid;
      if (templateParams && Object.keys(templateParams).length > 0) {
        payload.contentVariables = JSON.stringify(templateParams);
      }
    } else {
      if (body) payload.body = body;
      if (mediaUrls?.length) payload.mediaUrl = mediaUrls;
    }

    const resp = await client.messages.create(payload);
    await supabase
      .from('whatsapp_messages')
      .update({ status: 'sent', twilio_sid: resp.sid })
      .eq('id', msg?.id as string);
    const statusInsert: TablesInsert<'whatsapp_message_status_events'> = {
      rto_id: rtoId,
      message_id: msg?.id as string,
      event: 'sent',
      payload: { sid: resp.sid },
    };
    await supabase.from('whatsapp_message_status_events').insert(statusInsert);
    return { ok: true, sid: resp.sid };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await supabase
      .from('whatsapp_messages')
      .update({ status: 'failed', error: message })
      .eq('id', msg?.id as string);
    const statusInsert: TablesInsert<'whatsapp_message_status_events'> = {
      rto_id: rtoId,
      message_id: msg?.id as string,
      event: 'failed',
      payload: { error: message },
    };
    await supabase.from('whatsapp_message_status_events').insert(statusInsert);
    return { ok: false, error: message };
  }
}
