import { createClient as createServerSupabase } from '@/lib/supabase/server';
import { decryptSecret } from '@/lib/utils/crypto';

export type TwilioConfig = {
  accountSid: string;
  authToken: string;
  messagingServiceSid: string | null;
  validateWebhooks: boolean;
};

export async function getTwilioConfigForRto(
  rtoId: string
): Promise<TwilioConfig> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from('twilio_settings')
    .select(
      'account_sid, auth_token_cipher, messaging_service_sid, validate_webhooks'
    )
    .eq('rto_id', rtoId)
    .single();
  if (error || !data) {
    throw new Error(error?.message || 'Twilio settings not found for RTO');
  }
  const encKey = process.env.TWILIO_CFG_ENC_KEY;
  if (!encKey) {
    throw new Error('Missing TWILIO_CFG_ENC_KEY');
  }
  const authToken = decryptSecret(data.auth_token_cipher as string, encKey);
  return {
    accountSid: data.account_sid as string,
    authToken,
    messagingServiceSid: (data.messaging_service_sid as string) || null,
    validateWebhooks: Boolean(data.validate_webhooks),
  };
}

export async function getTwilioConfigForCurrentUser(): Promise<
  TwilioConfig & { rtoId: string }
> {
  const supabase = await createServerSupabase();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes?.user) throw new Error('Unauthorized');
  const { data: rtoId, error: rtoErr } = await supabase.rpc('get_my_rto_id');
  if (rtoErr || !rtoId) throw new Error('Unable to resolve RTO');
  const cfg = await getTwilioConfigForRto(rtoId as string);
  return { ...cfg, rtoId: rtoId as string };
}
