import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export type UpsertTwilioConfigInput = {
  account_sid?: string;
  auth_token?: string; // write-only
  messaging_service_sid?: string | null;
  validate_webhooks?: boolean;
};

async function upsertConfig(input: UpsertTwilioConfigInput) {
  const res = await fetch('/api/settings/twilio/config', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = (await res.json()) as { error?: string; details?: string };
  if (!res.ok) {
    throw new Error(
      data.details
        ? `${data.error}: ${data.details}`
        : data.error || 'Failed to save settings'
    );
  }
  return true;
}

/**
 * useUpsertTwilioConfig
 *
 * Mutation to create/update Twilio settings. Invalidates settings query.
 */
export const useUpsertTwilioConfig = () => {
  const queryClient = useQueryClient();
  return useMutation<boolean, Error, UpsertTwilioConfigInput>({
    mutationFn: upsertConfig,
    onSuccess: async () => {
      toast.success('Twilio settings saved');
      await queryClient.invalidateQueries({
        queryKey: ['settings', 'twilio', 'config'],
      });
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });
};
