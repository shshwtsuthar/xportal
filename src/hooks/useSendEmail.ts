import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export type SendEmailInput = {
  to: string[];
  subject: string;
  html: string;
};

export type SendEmailResult = { id: string | null };

async function sendEmailApi(input: SendEmailInput): Promise<SendEmailResult> {
  const res = await fetch('/api/emails/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = (await res.json()) as SendEmailResult & {
    error?: string;
    details?: string;
  };
  if (!res.ok) {
    const errorMsg = data.details
      ? `${data.error || 'Failed to send email'}: ${data.details}`
      : data.error || 'Failed to send email';
    throw new Error(errorMsg);
  }
  return { id: data.id ?? null };
}

/**
 * useSendEmail
 *
 * TanStack Query mutation for sending emails via Resend through our API.
 * @returns Mutation object to call mutate/mutateAsync with SendEmailInput
 */
export const useSendEmail = () => {
  const queryClient = useQueryClient();
  return useMutation<{ id: string | null }, Error, SendEmailInput>({
    mutationFn: sendEmailApi,
    onSuccess: async (_data) => {
      toast.success('Email sent successfully');
      // Invalidate any future email-related queries if added later
      await queryClient.invalidateQueries({ queryKey: ['emails'] });
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to send email');
    },
  });
};
