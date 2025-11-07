import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { TwilioSender } from './useListTwilioSenders';

export type CreateSenderInput = {
  friendly_name: string;
  phone_e164: string;
  channel: 'whatsapp' | 'sms';
  description?: string | null;
  phone_number_sid?: string | null;
  sender_sid?: string | null;
};

async function createSender(input: CreateSenderInput): Promise<TwilioSender> {
  const res = await fetch('/api/settings/twilio/senders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = (await res.json()) as TwilioSender & { error?: string };
  if (!res.ok) {
    throw new Error(data.error || 'Failed to create sender');
  }
  return data as TwilioSender;
}

export const useCreateTwilioSender = () => {
  const queryClient = useQueryClient();
  return useMutation<TwilioSender, Error, CreateSenderInput>({
    mutationFn: createSender,
    onSuccess: async () => {
      toast.success('Sender added');
      await queryClient.invalidateQueries({
        queryKey: ['settings', 'twilio', 'senders'],
      });
    },
    onError: (err) => toast.error(err.message),
  });
};
