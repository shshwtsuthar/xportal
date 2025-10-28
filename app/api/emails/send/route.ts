import { NextRequest } from 'next/server';
import { Resend } from 'resend';

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
};

function isValidEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

export async function POST(req: NextRequest) {
  try {
    const { to, subject, html } =
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

    const { data, error } = await resend.emails.send({
      from: resendFrom,
      to: uniqueRecipients,
      subject,
      html,
    });

    if (error) {
      return new Response(
        JSON.stringify({ error: `Failed to send email: ${error.message}` }),
        { status: 500 }
      );
    }

    return new Response(JSON.stringify({ id: data?.id ?? null }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
}
