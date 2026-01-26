import { NextRequest } from 'next/server';
import { createClient as createServerSupabase } from '@/lib/supabase/server';
import { createEmailService } from '@/lib/email/service';
import type { EmailAttachment, EmailRecipient } from '@/lib/email/types';

export const runtime = 'nodejs';

const resendApiKey = process.env.RESEND_API_KEY;
const resendFrom = process.env.RESEND_FROM;

if (!resendApiKey) {
  throw new Error('Missing RESEND_API_KEY');
}

if (!resendFrom) {
  throw new Error('Missing RESEND_FROM');
}

// TypeScript: After validation, we know these are strings
const validatedResendApiKey: string = resendApiKey;
const validatedResendFrom: string = resendFrom;

const emailService = createEmailService(
  validatedResendApiKey,
  validatedResendFrom
);

type SendEmailPayload = {
  to: string[];
  subject: string;
  html: string;
  cc?: string[];
  bcc?: string[];
  replyTo?: string | string[];
  attachments?: EmailAttachment[];
};

export async function POST(req: NextRequest) {
  try {
    const { to, subject, html, cc, bcc, replyTo, attachments } =
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

    // Build optional lists
    const uniqueCc = Array.from(
      new Set((cc ?? []).map((e) => e.trim()).filter((e) => e.length > 0))
    );
    const uniqueBcc = Array.from(
      new Set((bcc ?? []).map((e) => e.trim()).filter((e) => e.length > 0))
    );

    // Validate attachments
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    const MAX_FILES = 10;
    const validAttachments: EmailAttachment[] = [];

    if (attachments && Array.isArray(attachments)) {
      if (attachments.length > MAX_FILES) {
        return new Response(
          JSON.stringify({
            error: `Maximum ${MAX_FILES} attachments allowed`,
          }),
          { status: 400 }
        );
      }

      for (const att of attachments) {
        if (!att.filename || !att.content || !att.contentType || !att.size) {
          return new Response(
            JSON.stringify({
              error:
                'Invalid attachment format. Required: filename, content (base64), contentType, size',
            }),
            { status: 400 }
          );
        }

        if (att.size > MAX_FILE_SIZE) {
          return new Response(
            JSON.stringify({
              error: `Attachment ${att.filename} exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit`,
            }),
            { status: 400 }
          );
        }

        // Validate base64 content
        try {
          Buffer.from(att.content, 'base64');
        } catch (e) {
          return new Response(
            JSON.stringify({
              error: `Invalid base64 content for attachment ${att.filename}`,
            }),
            { status: 400 }
          );
        }

        validAttachments.push(att);
      }
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
      from_email: validatedResendFrom,
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

    // Insert attachments into database
    if (validAttachments.length > 0) {
      const attachmentRows = validAttachments.map((att) => ({
        email_message_id: emailMessageId,
        file_name: att.filename,
        content_type: att.contentType,
        size_bytes: att.size,
        storage_path: null, // We're not storing files in storage, just sending via Resend
      }));

      const { error: attachErr } = await supabase
        .from('email_message_attachments')
        .insert(attachmentRows);

      if (attachErr) {
        // Non-fatal: log but continue
        console.error('Attachment insert error:', attachErr);
      }
    }

    // Convert recipients to EmailRecipient format
    const emailRecipients: EmailRecipient[] = uniqueRecipients.map((email) => ({
      email,
    }));
    const ccRecipients: EmailRecipient[] = uniqueCc.map((email) => ({
      email,
    }));
    const bccRecipients: EmailRecipient[] = uniqueBcc.map((email) => ({
      email,
    }));

    // Send via smart email service (automatically chooses best method)
    const sendResult = await emailService.send({
      from: validatedResendFrom,
      to: emailRecipients,
      subject,
      html,
      text: textBody || undefined,
      cc: ccRecipients.length > 0 ? ccRecipients : undefined,
      bcc: bccRecipients.length > 0 ? bccRecipients : undefined,
      replyTo: replyTo as string | string[] | undefined,
      attachments: validAttachments.length > 0 ? validAttachments : undefined,
    });

    if (!sendResult.success) {
      const errorMessage =
        sendResult.failed && sendResult.failed.length > 0
          ? `Failed to send to ${sendResult.failed.length} recipient(s): ${sendResult.failed[0].error}`
          : 'Failed to send email';

      await supabase
        .from('email_messages')
        .update({
          status: 'FAILED',
          status_updated_at: new Date().toISOString(),
          failed_at: new Date().toISOString(),
          error_message: errorMessage,
          metadata: {
            source: 'api/emails/send',
            cc: uniqueCc,
            bcc: uniqueBcc,
            failed: sendResult.failed,
          },
        })
        .eq('id', emailMessageId);

      await supabase.from('email_message_status_events').insert({
        email_message_id: emailMessageId,
        event_type: 'FAILED',
        payload: {
          error: errorMessage,
          failed: sendResult.failed,
        },
      });

      return new Response(JSON.stringify({ error: errorMessage }), {
        status: 500,
      });
    }

    // Update to SENT and log event
    // Store first resend ID in main record, all IDs in metadata
    const firstResendId = sendResult.resendIds[0] ?? null;

    await supabase
      .from('email_messages')
      .update({
        status: 'SENT',
        status_updated_at: new Date().toISOString(),
        sent_at: new Date().toISOString(),
        resend_message_id: firstResendId,
        metadata: {
          source: 'api/emails/send',
          cc: uniqueCc,
          bcc: uniqueBcc,
          resendIds: sendResult.resendIds,
          totalRecipients: uniqueRecipients.length,
        },
      })
      .eq('id', emailMessageId);

    await supabase.from('email_message_status_events').insert({
      email_message_id: emailMessageId,
      event_type: 'SENT',
      payload: {
        id: firstResendId,
        allResendIds: sendResult.resendIds,
        totalSent: sendResult.resendIds.length,
      },
    });

    return new Response(
      JSON.stringify({
        id: emailMessageId,
        resendId: firstResendId,
        resendIds: sendResult.resendIds,
        totalSent: sendResult.resendIds.length,
      }),
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
