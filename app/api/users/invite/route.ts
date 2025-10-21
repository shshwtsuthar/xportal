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

    const { email, first_name, last_name, role } = await request.json();

    // Use service role for admin operations
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
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
    } catch (e) {
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

    const { error: emailErr } = await resend.emails.send({
      from: resendFrom,
      to: email,
      subject: 'You have been invited to XPortal',
      html: `
        <p>Hello ${first_name || ''} ${last_name || ''},</p>
        <p>You have been invited to join XPortal. Click the button below to accept your invite and set your password.</p>
        <p><a href="${linkData.properties.action_link}" style="display:inline-block;padding:10px 16px;background:#111;color:#fff;text-decoration:none;border-radius:6px">Accept Invitation</a></p>
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p><a href="${linkData.properties.action_link}">${linkData.properties.action_link}</a></p>
        <p>— XPortal Team</p>
      `,
    });

    if (emailErr) {
      return NextResponse.json({ error: emailErr.message }, { status: 500 });
    }

    return NextResponse.json({
      message: 'User invited successfully',
      invite_link: linkData.properties.action_link,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
