import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

type Params = {
  invoiceId: string;
  invoiceType: 'APPLICATION' | 'ENROLLMENT';
  paymentDate: string; // yyyy-mm-dd
  amountCents: number;
  notes?: string;
};

/**
 * Calls the record_payment RPC to atomically record a payment and update invoice totals.
 * Returns the payment_id for commission calculation.
 */
export const useRecordPayment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      invoiceId,
      invoiceType,
      paymentDate,
      amountCents,
      notes,
    }: Params): Promise<string> => {
      const supabase = createClient();
      const { data: paymentId, error } = await supabase.rpc('record_payment', {
        p_invoice_type: invoiceType,
        p_invoice_id: invoiceId,
        p_payment_date: paymentDate,
        p_amount_cents: amountCents,
        p_notes: notes ?? undefined,
      });
      if (error) throw new Error(error.message);
      if (!paymentId)
        throw new Error('Payment ID not returned from record_payment');
      return paymentId as string;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['student-invoices'] }),
        queryClient.invalidateQueries({ queryKey: ['invoices'] }),
        queryClient.invalidateQueries({ queryKey: ['application-invoices'] }),
        queryClient.invalidateQueries({ queryKey: ['finance-invoices'] }),
        queryClient.invalidateQueries({ queryKey: ['commission-invoices'] }),
      ]);
    },
  });
};
