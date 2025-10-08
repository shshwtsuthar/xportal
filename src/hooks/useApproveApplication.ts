import { useMutation, useQueryClient } from '@tanstack/react-query';

type Params = { applicationId: string };

/**
 * Calls the approve-application edge function to:
 * - Create student and enrollment
 * - Generate invoices from payment plan template
 * - Update application status to APPROVED
 */
export const useApproveApplication = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ applicationId }: Params) => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/approve-application`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ applicationId }),
        }
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Approval failed');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
};
