import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

type Payload = {
  applicationId: string;
  recipient: 'student' | 'agent';
};

/**
 * Sends an offer letter via email to either the student or their agent.
 * Updates application status to OFFER_SENT on success.
 */
export const useSendOfferLetter = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ applicationId, recipient }: Payload) => {
      const res = await fetch('/api/send-offer-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId, recipient }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to send offer letter');
      }

      return res.json();
    },
    onSuccess: (_data, variables) => {
      toast.success('Offer letter sent successfully');
      // Invalidate both the specific application and the applications list
      queryClient.invalidateQueries({
        queryKey: ['application', variables.applicationId],
      });
      queryClient.invalidateQueries({ queryKey: ['applications'] });
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : 'Failed to send offer letter';
      toast.error(message);
    },
  });
};
