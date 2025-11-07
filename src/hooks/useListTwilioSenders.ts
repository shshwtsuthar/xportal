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

type FetchTwilioSendersOptions = {
  init?: RequestInit;
  baseUrl?: string;
};

export const twilioSendersQueryKey = ['settings', 'twilio', 'senders'] as const;

export const fetchTwilioSenders = async (
  options: FetchTwilioSendersOptions = {}
): Promise<TwilioSender[]> => {
  const { init, baseUrl } = options;
  const url = baseUrl
    ? new URL('/api/settings/twilio/senders', baseUrl).toString()
    : '/api/settings/twilio/senders';

  const headers: HeadersInit = init?.headers
    ? init.headers instanceof Headers
      ? init.headers
      : { ...init.headers }
    : {};

  const res = await fetch(url, {
    cache: 'no-store',
    ...init,
    headers,
  });

  const data = (await res.json()) as TwilioSender[] | { error?: string };

  if (!res.ok) {
    const err = (data as { error?: string }).error || 'Failed to load senders';
    throw new Error(err);
  }

  return data as TwilioSender[];
};

/**
 * useListTwilioSenders
 *
 * Fetch list of Twilio senders for current RTO
 */
type UseListTwilioSendersOptions = {
  initialData?: TwilioSender[];
};

export const useListTwilioSenders = (
  options: UseListTwilioSendersOptions = {}
) => {
  return useQuery<TwilioSender[], Error>({
    queryKey: twilioSendersQueryKey,
    queryFn: () => fetchTwilioSenders(),
    staleTime: 5 * 60 * 1000, // 5 minutes - senders don't change often
    refetchOnWindowFocus: false, // Don't refetch on window focus
    initialData: options.initialData,
  });
};
