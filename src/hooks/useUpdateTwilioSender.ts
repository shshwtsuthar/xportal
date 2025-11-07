import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { TwilioSender } from './useListTwilioSenders';

export type UpdateSenderInput = Partial<
  Omit<TwilioSender, 'id' | 'rto_id' | 'created_at' | 'updated_at'>
> & {
  id: string;
};

async function updateSender(input: UpdateSenderInput): Promise<TwilioSender> {
  const { id, ...rest } = input;
  const res = await fetch(`/api/settings/twilio/senders/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(rest),
  });
  const data = (await res.json()) as
    | TwilioSender
    | { error?: string; details?: string };
  if (!res.ok) {
    const msg =
      'error' in data && data.error
        ? data.details
          ? `${data.error}: ${data.details}`
          : data.error
        : 'Failed to update sender';
    throw new Error(msg);
  }
  return data as TwilioSender;
}

export const useUpdateTwilioSender = () => {
  const queryClient = useQueryClient();
  return useMutation<TwilioSender, Error, UpdateSenderInput>({
    mutationFn: updateSender,
    onSuccess: async () => {
      toast.success('Sender updated');
      await queryClient.invalidateQueries({
        queryKey: ['settings', 'twilio', 'senders'],
      });
    },
    onError: (err) => toast.error(err.message),
  });
};
