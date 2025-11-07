import { getTwilioConfigForRto } from './credentials';
import { createClient as createServerSupabase } from '@/lib/supabase/server';
import twilio from 'twilio';

export async function makeTwilioClient(rtoId: string) {
  const { accountSid, authToken } = await getTwilioConfigForRto(rtoId);
  return twilio(accountSid, authToken);
}

export type FromSelection = {
  from?: string;
  messagingServiceSid?: string | null;
};

export async function selectFrom(
  rtoId: string,
  opts: { senderId?: string | null }
): Promise<FromSelection> {
  const supabase = await createServerSupabase();
  const { data: cfg } = await supabase
    .from('twilio_settings')
    .select('messaging_service_sid')
    .eq('rto_id', rtoId)
    .maybeSingle();

  if (opts.senderId) {
    const { data: sender } = await supabase
      .from('twilio_senders')
      .select('phone_e164, channel')
      .eq('id', opts.senderId)
      .single();
    if (!sender) throw new Error('Sender not found');
    if (sender.channel !== 'whatsapp' && sender.channel !== 'sms') {
      throw new Error('Unsupported channel');
    }
    return {
      from:
        sender.channel === 'whatsapp'
          ? `whatsapp:${sender.phone_e164}`
          : sender.phone_e164,
    };
  }

  if (cfg?.messaging_service_sid) {
    return { messagingServiceSid: cfg.messaging_service_sid };
  }
  throw new Error('No sender selected and no Messaging Service SID configured');
}
