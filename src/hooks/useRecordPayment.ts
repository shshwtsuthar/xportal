import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

type Params = {
  invoiceId: string;
  paymentDate: string;
  amountCents: number;
  notes?: string;
};

/**
 * Calls the record_payment RPC to atomically record a payment and update invoice totals.
 */
export const useRecordPayment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      invoiceId,
      paymentDate,
      amountCents,
      notes,
    }: Params) => {
      const supabase = createClient();
      const { error } = await supabase.rpc('record_payment', {
        p_invoice_id: invoiceId,
        p_payment_date: paymentDate,
        p_amount_cents: amountCents,
        p_notes: notes,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
};
