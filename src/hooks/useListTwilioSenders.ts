import { useQuery } from '@tanstack/react-query';

export type TwilioSender = {
  id: string;
  rto_id: string;
  channel: 'whatsapp' | 'sms';
  phone_e164: string;
  friendly_name: string;
  description: string | null;
  phone_number_sid: string | null;
  sender_sid: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

async function fetchSenders(): Promise<TwilioSender[]> {
  const res = await fetch('/api/settings/twilio/senders', {
    cache: 'no-store',
  });
  const data = (await res.json()) as TwilioSender[] | { error: string };
  if (!res.ok) {
    const err = (data as { error?: string }).error || 'Failed to load senders';
    throw new Error(err);
  }
  return data as TwilioSender[];
}

/**
 * useListTwilioSenders
 *
 * Fetch list of Twilio senders for current RTO
 */
export const useListTwilioSenders = () => {
  return useQuery<TwilioSender[], Error>({
    queryKey: ['settings', 'twilio', 'senders'],
    queryFn: fetchSenders,
    staleTime: 5 * 60 * 1000, // 5 minutes - senders don't change often
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });
};
