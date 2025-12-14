import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient();

    // Ensure requester is authenticated
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Must be admin
    const requesterRole = (
      user.app_metadata as Record<string, unknown> | undefined
    )?.role;
    if (requesterRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const rtoId = (user.app_metadata as Record<string, unknown> | undefined)
      ?.rto_id as string | undefined;
    if (!rtoId) {
      return NextResponse.json(
        { error: 'Missing RTO context' },
        { status: 400 }
      );
    }

    const { email, first_name, last_name } = await request.json();
    const role = 'TRAINER'; // Always set to TRAINER

    // Use service role for admin operations
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const serviceRoleKey = process.env.SERVICE_ROLE_KEY as string;
    if (!url || !serviceRoleKey) {
      return NextResponse.json(
        { error: 'Server misconfiguration' },
        { status: 500 }
      );
    }

    const supabaseAdmin = createAdminClient(url, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Generate invite link (does not send email by itself)
    const origin = new URL(request.url).origin;
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || origin;
    const { data: linkData, error: linkErr } =
      await supabaseAdmin.auth.admin.generateLink({
        type: 'invite',
        email,
        options: {
          data: {
            first_name,
            last_name,
            rto_id: rtoId,
            role,
          },
          // Route via callback so server can exchange code for session, then continue to update-password
          redirectTo: `${siteUrl}/auth/callback?next=/auth/update-password`,
        },
      });

    if (linkErr || !linkData?.properties?.action_link) {
      return NextResponse.json(
        { error: linkErr?.message || 'Failed to create invite link' },
        { status: 400 }
      );
    }

    // Ensure app_metadata is set prior to user accepting invite
    try {
      const invitedUserId = linkData?.user?.id as string | undefined;
      if (invitedUserId) {
        await supabaseAdmin.auth.admin.updateUserById(invitedUserId, {
          app_metadata: { rto_id: rtoId, role },
          user_metadata: { first_name, last_name },
        });
      }
    } catch {
      // Non-fatal: email still goes out; missing app_metadata will be handled later
    }

    // Send email via Resend
    const resendApiKey = process.env.RESEND_API_KEY;
    const resendFrom = process.env.RESEND_FROM;
    if (!resendApiKey || !resendFrom) {
      return NextResponse.json(
        { error: 'Email not configured' },
        { status: 500 }
      );
    }
    const resend = new Resend(resendApiKey);

    const htmlBody = `
        <p>Hello ${first_name || ''} ${last_name || ''},</p>
        <p>You have been invited to join XPortal as a Trainer. Click the button below to accept your invite and set your password.</p>
        <p><a href="${linkData.properties.action_link}" style="display:inline-block;padding:10px 16px;background:#111;color:#fff;text-decoration:none;border-radius:6px">Accept Invitation</a></p>
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p><a href="${linkData.properties.action_link}">${linkData.properties.action_link}</a></p>
        <p>— XPortal Team</p>
      `;

    // Prepare plain-text snapshot (basic)
    const textBody = htmlBody
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const subject = 'You have been invited to XPortal as a Trainer';

    // Ensure created_by references an existing profile; fall back to NULL if not found
    const { data: profileRow } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    // Insert QUEUED email message
    const insertPayload = {
      rto_id: rtoId,
      created_by: profileRow?.id ?? null,
      from_email: resendFrom,
      from_name: null,
      reply_to: null,
      subject,
      html_body: htmlBody,
      text_body: textBody || null,
      metadata: {
        source: 'api/trainers/invite',
        invited_email: email,
        invited_role: role,
        invited_user_id: linkData?.user?.id ?? null,
      },
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
      return NextResponse.json(
        {
          error: 'Failed to queue email',
          details: insertErr?.message || insertErr?.code || 'Unknown error',
        },
        { status: 500 }
      );
    }

    const emailMessageId = insertMsg.id as string;

    // Insert participant (TO)
    const { error: partErr } = await supabase
      .from('email_message_participants')
      .insert({
        email_message_id: emailMessageId,
        type: 'TO',
        email: email,
        display_name:
          first_name && last_name ? `${first_name} ${last_name}` : null,
      });

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
      return NextResponse.json(
        { error: 'Failed to insert participants' },
        { status: 500 }
      );
    }

    // Send via Resend
    const { data: emailResult, error: emailErr } = await resend.emails.send({
      from: resendFrom,
      to: email,
      subject,
      html: htmlBody,
    });

    if (emailErr) {
      await supabase
        .from('email_messages')
        .update({
          status: 'FAILED',
          status_updated_at: new Date().toISOString(),
          failed_at: new Date().toISOString(),
          error_message: emailErr.message,
        })
        .eq('id', emailMessageId);
      await supabase.from('email_message_status_events').insert({
        email_message_id: emailMessageId,
        event_type: 'FAILED',
        payload: { error: emailErr.message },
      });
      return NextResponse.json({ error: emailErr.message }, { status: 500 });
    }

    // Update to SENT and log event
    await supabase
      .from('email_messages')
      .update({
        status: 'SENT',
        status_updated_at: new Date().toISOString(),
        sent_at: new Date().toISOString(),
        resend_message_id: emailResult?.id ?? null,
      })
      .eq('id', emailMessageId);

    await supabase.from('email_message_status_events').insert({
      email_message_id: emailMessageId,
      event_type: 'SENT',
      payload: { id: emailResult?.id ?? null },
    });

    return NextResponse.json({
      message: 'Trainer invited successfully',
      invite_link: linkData.properties.action_link,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
