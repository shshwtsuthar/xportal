import { NextRequest } from 'next/server';
import { createClient as createServerSupabase } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

export const runtime = 'nodejs';

const resendApiKey = process.env.RESEND_API_KEY;
const resendFrom = process.env.RESEND_FROM; // e.g. "Acme RTO <no-reply@yourdomain.com>"

if (!resendApiKey) {
  throw new Error('Missing RESEND_API_KEY');
}

const resend = new Resend(resendApiKey);

export async function POST(req: NextRequest) {
  try {
    const { applicationId, recipient } = await req.json();

    if (!applicationId || !recipient) {
      return new Response(
        JSON.stringify({ error: 'applicationId and recipient are required' }),
        { status: 400 }
      );
    }

    if (!['student', 'agent'].includes(recipient)) {
      return new Response(
        JSON.stringify({
          error: 'recipient must be either "student" or "agent"',
        }),
        { status: 400 }
      );
    }

    const supabase = await createServerSupabase();
    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch application with related data
    const { data: application, error: appErr } = await supabase
      .from('applications')
      .select(
        `*,
         programs:program_id(id, code, name, nominal_hours),
         agents:agent_id(id, name, contact_email),
         rtos:rto_id(id, name, rto_code, email_address)`
      )
      .eq('id', applicationId)
      .single();

    if (appErr || !application) {
      return new Response(JSON.stringify({ error: 'Application not found' }), {
        status: 404,
      });
    }

    // Validate application status
    if (application.status !== 'OFFER_GENERATED') {
      return new Response(
        JSON.stringify({
          error: `Application status must be OFFER_GENERATED, current status: ${application.status}`,
        }),
        { status: 400 }
      );
    }

    // Determine recipient email
    let recipientEmail: string;
    let recipientName: string;

    if (recipient === 'student') {
      if (!application.email) {
        return new Response(
          JSON.stringify({ error: 'Student email not found' }),
          { status: 400 }
        );
      }
      recipientEmail = application.email;
      recipientName = `${application.first_name} ${application.last_name}`;
    } else {
      if (!application.agent_id || !application.agents?.contact_email) {
        return new Response(
          JSON.stringify({ error: 'Agent email not found' }),
          { status: 400 }
        );
      }
      recipientEmail = application.agents.contact_email;
      recipientName = application.agents.name || 'Agent';
    }

    // Ensure related data required for email is present
    if (!application.programs || !application.programs.name) {
      return new Response(
        JSON.stringify({ error: 'Program details not found for application' }),
        { status: 400 }
      );
    }
    if (!application.rtos || !application.rtos.name) {
      return new Response(
        JSON.stringify({ error: 'RTO details not found for application' }),
        { status: 400 }
      );
    }

    const programName = application.programs.name;
    const rtoName = application.rtos.name;
    const rtoEmail = application.rtos.email_address ?? null;

    // Get the most recent offer letter
    const { data: offerLetter, error: offerErr } = await admin
      .from('offer_letters')
      .select('*')
      .eq('application_id', applicationId)
      .order('generated_at', { ascending: false })
      .limit(1)
      .single();

    if (offerErr || !offerLetter) {
      return new Response(
        JSON.stringify({ error: 'No offer letter found for this application' }),
        { status: 404 }
      );
    }

    // Download PDF from Supabase Storage
    const { data: pdfData, error: downloadErr } = await admin.storage
      .from('applications')
      .download(offerLetter.file_path);

    if (downloadErr || !pdfData) {
      return new Response(
        JSON.stringify({
          error: `Failed to download PDF: ${downloadErr?.message}`,
        }),
        { status: 500 }
      );
    }

    // Convert blob to buffer
    const pdfBuffer = Buffer.from(await pdfData.arrayBuffer());

    // Send email using Resend
    if (!resendFrom && !rtoEmail) {
      return new Response(
        JSON.stringify({
          error:
            'Sender not configured. Set RESEND_FROM or provide RTO email address.',
        }),
        { status: 400 }
      );
    }
    const fromAddress: string = (resendFrom ?? rtoEmail)!;
    const emailData = {
      from: fromAddress,
      to: recipientEmail,
      subject: `Offer Letter - ${programName}`,
      html: `
        <p>Dear ${recipientName},</p>
        <p>Please find attached your offer letter for ${programName}.</p>
        <p>Best regards,<br/>${rtoName}</p>
      `,
      reply_to: rtoEmail || undefined,
      attachments: [
        {
          filename: 'offer-letter.pdf',
          content: pdfBuffer,
        },
      ],
    };

    const { data: emailResult, error: emailErr } =
      await resend.emails.send(emailData);

    if (emailErr) {
      return new Response(
        JSON.stringify({ error: `Failed to send email: ${emailErr.message}` }),
        { status: 500 }
      );
    }

    // Update application status to OFFER_SENT
    const { error: statusErr } = await admin
      .from('applications')
      .update({ status: 'OFFER_SENT' })
      .eq('id', applicationId);

    if (statusErr) {
      return new Response(
        JSON.stringify({ error: `Status update failed: ${statusErr.message}` }),
        { status: 500 }
      );
    }

    return new Response(
      JSON.stringify({
        message: 'Offer letter sent successfully',
        emailId: emailResult?.id,
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
