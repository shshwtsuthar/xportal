import { makeTwilioClient } from '@/lib/twilio/client';
import { getTwilioConfigForCurrentUser } from '@/lib/twilio/credentials';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const cfg = await getTwilioConfigForCurrentUser();
    const client = await makeTwilioClient(cfg.rtoId);
    // Lightweight call: fetch account friendly name
    const account = await client.api.accounts(cfg.accountSid).fetch();
    return new Response(
      JSON.stringify({
        ok: true,
        details: { friendlyName: account.friendlyName },
      }),
      { headers: { 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 200,
    });
  }
}
