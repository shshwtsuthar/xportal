import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

async function deleteSender(id: string): Promise<boolean> {
  const res = await fetch(`/api/settings/twilio/senders/${id}`, {
    method: 'DELETE',
  });
  const data = (await res.json()) as { success?: boolean; error?: string };
  if (!res.ok || data.success !== true) {
    throw new Error(data.error || 'Failed to delete sender');
  }
  return true;
}

export const useDeleteTwilioSender = () => {
  const queryClient = useQueryClient();
  return useMutation<boolean, Error, string>({
    mutationFn: deleteSender,
    onSuccess: async () => {
      toast.success('Sender removed');
      await queryClient.invalidateQueries({
        queryKey: ['settings', 'twilio', 'senders'],
      });
    },
    onError: (err) => toast.error(err.message),
  });
};
