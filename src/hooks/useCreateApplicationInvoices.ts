import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

type Params = {
  applicationId: string;
};

type Response = {
  message: string;
  count: number;
};

/**
 * Hook to create application invoices for deposits.
 * Idempotent - will return existing count if invoices already exist.
 */
export const useCreateApplicationInvoices = () => {
  const queryClient = useQueryClient();
  return useMutation<Response, Error, Params>({
    mutationFn: async ({ applicationId }) => {
      const res = await fetch('/api/create-application-invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(
          errorData.error || 'Failed to create application invoices'
        );
      }

      return res.json();
    },
    onSuccess: (data, variables) => {
      if (data.count > 0) {
        toast.success(`Created ${data.count} deposit invoice(s)`);
      } else {
        toast.info('Invoices already exist for this application');
      }
      // Invalidate invoice queries
      queryClient.invalidateQueries({
        queryKey: ['application-invoices'],
      });
      queryClient.invalidateQueries({
        queryKey: ['application-invoices', variables.applicationId],
      });
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : 'Failed to create invoices';
      toast.error(message);
    },
  });
};
