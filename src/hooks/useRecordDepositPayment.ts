import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

type Params = {
  depositInvoiceId: string;
  paymentDate: string; // yyyy-mm-dd
  amountCents: number;
  notes?: string;
};

/**
 * Records a payment against a deposit invoice.
 * Calls the record_deposit_payment RPC function.
 */
export const useRecordDepositPayment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      depositInvoiceId,
      paymentDate,
      amountCents,
      notes,
    }: Params): Promise<string> => {
      const supabase = createClient();
      const { data: paymentId, error } = await supabase.rpc(
        'record_deposit_payment',
        {
          p_deposit_invoice_id: depositInvoiceId,
          p_payment_date: paymentDate,
          p_amount_cents: amountCents,
          p_notes: notes ?? undefined,
        }
      );

      if (error) throw new Error(error.message);
      if (!paymentId)
        throw new Error('Payment ID not returned from record_deposit_payment');
      return paymentId as string;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['application-deposit-invoices'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['applications-with-deposits'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['application-deposit-status'],
        }),
      ]);
    },
  });
};
