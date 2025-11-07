import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

type SendInput = {
  senderId: string;
  toE164?: string;
  threadId?: string;
  body: string;
};

async function sendApi(input: SendInput) {
  const res = await fetch('/api/communications/whatsapp/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok || data.ok === false) {
    throw new Error(data.error || 'Failed to send message');
  }
  return data as { ok: boolean; sid?: string };
}

export function useSendWhatsAppMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: sendApi,
    onSuccess: async (_data, variables) => {
      toast.success('Message sent');
      if (variables.threadId) {
        await qc.invalidateQueries({
          queryKey: ['whatsapp', 'messages', variables.threadId],
        });
      }
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : 'Failed to send'),
  });
}
