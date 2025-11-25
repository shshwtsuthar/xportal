import { useMutation, useQueryClient } from '@tanstack/react-query';

type Params = {
  paymentId: string;
};

type XeroSyncPaymentResponse = {
  success: boolean;
  xeroPaymentId?: string;
  error?: string;
};

/**
 * Confirms a recorded payment by syncing it to Xero via the xero-sync-payment Edge Function.
 * On success, invalidates payment and invoice queries so UI reflects updated sync/payment status.
 */
export const useConfirmPayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      paymentId,
    }: Params): Promise<XeroSyncPaymentResponse> => {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !anonKey) {
        throw new Error('Supabase environment variables are not configured');
      }

      const res = await fetch(`${supabaseUrl}/functions/v1/xero-sync-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${anonKey}`,
        },
        body: JSON.stringify({ paymentId }),
      });

      const json = (await res.json()) as XeroSyncPaymentResponse;
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to confirm payment in Xero');
      }

      return json;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['unconfirmed-payments'] }),
        queryClient.invalidateQueries({ queryKey: ['invoices'] }),
        queryClient.invalidateQueries({ queryKey: ['finance-invoices'] }),
        queryClient.invalidateQueries({ queryKey: ['student-invoices'] }),
      ]);
    },
  });
};
