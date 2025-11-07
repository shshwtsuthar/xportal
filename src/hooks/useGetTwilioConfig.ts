import { useQuery } from '@tanstack/react-query';

export type TwilioConfig = {
  account_sid: string | null;
  auth_token_masked: string | null;
  messaging_service_sid: string | null;
  validate_webhooks: boolean;
  has_token: boolean;
};

type FetchTwilioConfigOptions = {
  init?: RequestInit;
  baseUrl?: string;
};

export const twilioConfigQueryKey = ['settings', 'twilio', 'config'] as const;

export const fetchTwilioConfig = async (
  options: FetchTwilioConfigOptions = {}
): Promise<TwilioConfig> => {
  const { init, baseUrl } = options;
  const url = baseUrl
    ? new URL('/api/settings/twilio/config', baseUrl).toString()
    : '/api/settings/twilio/config';

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
};

/**
 * useGetTwilioConfig
 *
 * Fetch per-RTO Twilio settings. Returns masked token only.
 * @returns useQuery result with TwilioConfig
 */
type UseGetTwilioConfigOptions = {
  initialData?: TwilioConfig;
};

export const useGetTwilioConfig = (options: UseGetTwilioConfigOptions = {}) => {
  return useQuery<TwilioConfig, Error>({
    queryKey: twilioConfigQueryKey,
    queryFn: () => fetchTwilioConfig(),
    staleTime: 5 * 60 * 1000, // 5 minutes - config doesn't change often
    refetchOnWindowFocus: false, // Don't refetch on window focus
    initialData: options.initialData,
  });
};
