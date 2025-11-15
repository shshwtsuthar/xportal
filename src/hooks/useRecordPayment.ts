import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

type Params = {
  invoiceId: string;
  paymentDate: string; // yyyy-mm-dd
  amountCents: number;
  notes?: string;
};

/**
 * Calls the record_payment RPC to atomically record a payment and update invoice totals.
 * Returns the payment_id for commission calculation.
 * Also syncs the payment to Xero asynchronously (non-blocking).
 */
export const useRecordPayment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      invoiceId,
      paymentDate,
      amountCents,
      notes,
    }: Params): Promise<string> => {
      const supabase = createClient();
      const { data: paymentId, error } = await supabase.rpc('record_payment', {
        p_invoice_id: invoiceId,
        p_payment_date: paymentDate,
        p_amount_cents: amountCents,
        p_notes: notes ?? undefined,
      });
      if (error) throw new Error(error.message);
      if (!paymentId)
        throw new Error('Payment ID not returned from record_payment');

      // Sync payment to Xero asynchronously (non-blocking)
      // Failures are logged but don't affect the payment recording
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (supabaseUrl && anonKey) {
        fetch(`${supabaseUrl}/functions/v1/xero-sync-payment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${anonKey}`,
          },
          body: JSON.stringify({ paymentId }),
        }).catch((err) => {
          // Log but don't throw - Xero sync is non-critical
          console.warn('Xero payment sync failed (non-blocking):', err);
        });
      }

      return paymentId as string;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['student-invoices'] }),
        queryClient.invalidateQueries({ queryKey: ['invoices'] }),
        queryClient.invalidateQueries({ queryKey: ['finance-invoices'] }),
        queryClient.invalidateQueries({ queryKey: ['commission-invoices'] }),
      ]);
    },
  });
};
