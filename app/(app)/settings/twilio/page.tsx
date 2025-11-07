import { cookies, headers } from 'next/headers';
import {
  HydrationBoundary,
  QueryClient,
  dehydrate,
} from '@tanstack/react-query';
import {
  fetchTwilioConfig,
  twilioConfigQueryKey,
} from '@/src/hooks/useGetTwilioConfig';
import {
  fetchTwilioSenders,
  twilioSendersQueryKey,
} from '@/src/hooks/useListTwilioSenders';
import type { TwilioConfig } from '@/src/hooks/useGetTwilioConfig';
import type { TwilioSender } from '@/src/hooks/useListTwilioSenders';
import { TwilioSettingsClient } from './TwilioSettingsClient';

export default async function TwilioSettingsPage() {
  const queryClient = new QueryClient();

  const headerStore = await headers();
  const forwardedProto = headerStore.get('x-forwarded-proto');
  const forwardedHost = headerStore.get('x-forwarded-host');
  const host = headerStore.get('host');
  const protocol = forwardedProto || 'http';
  const resolvedHost = forwardedHost || host;
  const baseUrl = resolvedHost
    ? `${protocol}://${resolvedHost}`
    : process.env.NEXT_PUBLIC_APP_URL;

  const cookieStore = await cookies();
  const cookieEntries = cookieStore.getAll();
  const cookieHeader = cookieEntries.length
    ? cookieEntries
        .map((cookieEntry) => `${cookieEntry.name}=${cookieEntry.value}`)
        .join('; ')
    : undefined;

  const sharedInit = cookieHeader
    ? ({ headers: { cookie: cookieHeader } } satisfies RequestInit)
    : undefined;

  if (!baseUrl) {
    throw new Error('Unable to resolve base URL for Twilio settings prefetch');
  }

  try {
    await queryClient.prefetchQuery({
      queryKey: twilioConfigQueryKey,
      queryFn: () =>
        fetchTwilioConfig({
          baseUrl,
          init: sharedInit,
        }),
    });
  } catch (error) {
    console.error('Failed to prefetch Twilio config', error);
  }

  try {
    await queryClient.prefetchQuery({
      queryKey: twilioSendersQueryKey,
      queryFn: () =>
        fetchTwilioSenders({
          baseUrl,
          init: sharedInit,
        }),
    });
  } catch (error) {
    console.error('Failed to prefetch Twilio senders', error);
  }

  const dehydratedState = dehydrate(queryClient);
  const initialConfig = queryClient.getQueryData(twilioConfigQueryKey) as
    | TwilioConfig
    | undefined;
  const initialSenders = queryClient.getQueryData(twilioSendersQueryKey) as
    | TwilioSender[]
    | undefined;

  return (
    <HydrationBoundary state={dehydratedState}>
      <TwilioSettingsClient
        initialConfig={initialConfig ?? null}
        initialSenders={initialSenders ?? null}
      />
    </HydrationBoundary>
  );
}
