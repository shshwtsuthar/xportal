import { NextRequest } from 'next/server';
import { Resend } from 'resend';
import { createClient as createServerSupabase } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const resendApiKey = process.env.RESEND_API_KEY;
const resendFrom = process.env.RESEND_FROM;

if (!resendApiKey) {
  throw new Error('Missing RESEND_API_KEY');
}

const resend = new Resend(resendApiKey);

type SendEmailPayload = {
  to: string[];
  subject: string;
  html: string;
  cc?: string[];
  bcc?: string[];
  replyTo?: string | string[];
};

function isValidEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

export async function POST(req: NextRequest) {
  try {
    const { to, subject, html, cc, bcc, replyTo } =
      (await req.json()) as Partial<SendEmailPayload>;

    if (!Array.isArray(to) || to.length === 0 || !subject || !html) {
      return new Response(JSON.stringify({ error: 'Invalid payload' }), {
        status: 400,
      });
    }

    const uniqueRecipients = Array.from(
      new Set(
        to
          .map((r) => (typeof r === 'string' ? r.trim() : ''))
          .filter((r) => r.length > 0)
      )
    );

    if (uniqueRecipients.length === 0) {
      return new Response(JSON.stringify({ error: 'No valid recipients' }), {
        status: 400,
      });
    }

    const invalid = uniqueRecipients.filter((r) => !isValidEmail(r));
    if (invalid.length > 0) {
      return new Response(
        JSON.stringify({
          error: `Invalid recipient(s): ${invalid.join(', ')}`,
        }),
        { status: 400 }
      );
    }

    if (!resendFrom) {
      return new Response(
        JSON.stringify({ error: 'Missing RESEND_FROM configuration' }),
        { status: 500 }
      );
    }

    // Build optional lists
    const uniqueCc = Array.from(
      new Set((cc ?? []).map((e) => e.trim()).filter((e) => e.length > 0))
    );
    const uniqueBcc = Array.from(
      new Set((bcc ?? []).map((e) => e.trim()).filter((e) => e.length > 0))
    );
    const invalidCc = uniqueCc.filter((e) => !isValidEmail(e));
    const invalidBcc = uniqueBcc.filter((e) => !isValidEmail(e));
    if (invalidCc.length || invalidBcc.length) {
      return new Response(
        JSON.stringify({
          error: `Invalid cc/bcc recipient(s): ${[...invalidCc, ...invalidBcc].join(', ')}`,
        }),
        { status: 400 }
      );
    }

    // Prepare plain-text snapshot (basic)
    const textBody = html
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Resolve auth context
    const supabase = await createServerSupabase();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', details: userError?.message }),
        { status: 401 }
      );
    }
    const { data: rtoIdRes, error: rtoErr } =
      await supabase.rpc('get_my_rto_id');
    if (rtoErr || !rtoIdRes) {
      return new Response(
        JSON.stringify({
          error: 'Unable to resolve RTO',
          details: rtoErr?.message,
        }),
        { status: 400 }
      );
    }

    // Ensure created_by references an existing profile; fall back to NULL if not found
    const { data: profileRow } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    // Insert QUEUED email message
    const insertPayload = {
      rto_id: rtoIdRes as string,
      created_by: profileRow?.id ?? null,
      from_email: resendFrom,
      from_name: null,
      reply_to: Array.isArray(replyTo)
        ? replyTo
        : typeof replyTo === 'string' && replyTo
          ? [replyTo]
          : null,
      subject,
      html_body: html,
      text_body: textBody || null,
      metadata: { source: 'api/emails/send', cc: uniqueCc, bcc: uniqueBcc },
      status: 'QUEUED' as const,
      status_updated_at: new Date().toISOString(),
    };

    const { data: insertMsg, error: insertErr } = await supabase
      .from('email_messages')
      .insert(insertPayload)
      .select('id')
      .single();

    if (insertErr || !insertMsg) {
      console.error('Email insert error:', insertErr);
      return new Response(
        JSON.stringify({
          error: 'Failed to queue email',
          details: insertErr?.message || insertErr?.code || 'Unknown error',
        }),
        { status: 500 }
      );
    }

    const emailMessageId = insertMsg.id as string;

    // Insert participants (TO/CC/BCC)
    const participantRows: Array<{
      email_message_id: string;
      type: 'TO' | 'CC' | 'BCC';
      email: string;
      display_name?: string | null;
    }> = [];
    uniqueRecipients.forEach((e) =>
      participantRows.push({
        email_message_id: emailMessageId,
        type: 'TO',
        email: e,
      })
    );
    uniqueCc.forEach((e) =>
      participantRows.push({
        email_message_id: emailMessageId,
        type: 'CC',
        email: e,
      })
    );
    uniqueBcc.forEach((e) =>
      participantRows.push({
        email_message_id: emailMessageId,
        type: 'BCC',
        email: e,
      })
    );

    if (participantRows.length > 0) {
      const { error: partErr } = await supabase
        .from('email_message_participants')
        .insert(participantRows);
      if (partErr) {
        // Best-effort: continue, but mark FAILED
        await supabase
          .from('email_messages')
          .update({
            status: 'FAILED',
            failed_at: new Date().toISOString(),
            error_message: 'Failed to insert participants',
          })
          .eq('id', emailMessageId);
        return new Response(
          JSON.stringify({ error: 'Failed to insert participants' }),
          { status: 500 }
        );
      }
    }

    // Send via Resend
    const { data, error } = await resend.emails.send({
      from: resendFrom,
      to: uniqueRecipients,
      subject,
      html,
      replyTo: replyTo as string | string[] | undefined,
      cc: uniqueCc.length ? uniqueCc : undefined,
      bcc: uniqueBcc.length ? uniqueBcc : undefined,
    });

    if (error) {
      await supabase
        .from('email_messages')
        .update({
          status: 'FAILED',
          status_updated_at: new Date().toISOString(),
          failed_at: new Date().toISOString(),
          error_message: error.message,
        })
        .eq('id', emailMessageId);
      await supabase.from('email_message_status_events').insert({
        email_message_id: emailMessageId,
        event_type: 'FAILED',
        payload: { error: error.message },
      });
      return new Response(
        JSON.stringify({ error: `Failed to send email: ${error.message}` }),
        { status: 500 }
      );
    }

    // Update to SENT and log event
    await supabase
      .from('email_messages')
      .update({
        status: 'SENT',
        status_updated_at: new Date().toISOString(),
        sent_at: new Date().toISOString(),
        resend_message_id: data?.id ?? null,
      })
      .eq('id', emailMessageId);

    await supabase.from('email_message_status_events').insert({
      email_message_id: emailMessageId,
      event_type: 'SENT',
      payload: { id: data?.id ?? null },
    });

    return new Response(
      JSON.stringify({ id: emailMessageId, resendId: data?.id ?? null }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
}
