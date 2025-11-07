import { useQuery } from '@tanstack/react-query';

export type TwilioConfig = {
  account_sid: string | null;
  auth_token_masked: string | null;
  messaging_service_sid: string | null;
  validate_webhooks: boolean;
  has_token: boolean;
};

async function fetchConfig(): Promise<TwilioConfig> {
  const res = await fetch('/api/settings/twilio/config', { cache: 'no-store' });
  const data = (await res.json()) as Partial<TwilioConfig> & {
    error?: string;
    details?: string;
  };
  if (!res.ok) {
    throw new Error(data.error || 'Failed to load Twilio settings');
  }
  return {
    account_sid: data.account_sid ?? null,
    auth_token_masked: data.auth_token_masked ?? null,
    messaging_service_sid: data.messaging_service_sid ?? null,
    validate_webhooks:
      typeof data.validate_webhooks === 'boolean'
        ? data.validate_webhooks
        : true,
    has_token: Boolean(data.has_token),
  };
}

/**
 * useGetTwilioConfig
 *
 * Fetch per-RTO Twilio settings. Returns masked token only.
 * @returns useQuery result with TwilioConfig
 */
export const useGetTwilioConfig = () => {
  return useQuery<TwilioConfig, Error>({
    queryKey: ['settings', 'twilio', 'config'],
    queryFn: fetchConfig,
    staleTime: 5 * 60 * 1000, // 5 minutes - config doesn't change often
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });
};
