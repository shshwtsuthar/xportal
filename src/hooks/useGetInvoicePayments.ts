import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Tables } from '@/database.types';

export type InvoiceType = 'APPLICATION' | 'ENROLLMENT';

export type InvoicePaymentRow = Tables<'payments'> & {
  recorded_by_profile?: Pick<
    Tables<'profiles'>,
    'first_name' | 'last_name'
  > | null;
};

type Params = {
  invoiceId?: string;
  invoiceType?: InvoiceType;
};

export const useGetInvoicePayments = ({ invoiceId, invoiceType }: Params) => {
  return useQuery({
    queryKey: ['invoice-payments', invoiceId, invoiceType],
    enabled: !!invoiceId && !!invoiceType,
    queryFn: async (): Promise<InvoicePaymentRow[]> => {
      if (!invoiceId || !invoiceType) {
        return [];
      }

      const supabase = createClient();

      const { data, error } = await supabase
        .from('payments')
        .select(
          '*, recorded_by_profile:profiles!recorded_by(first_name, last_name)'
        )
        .eq('invoice_id', invoiceId)
        .eq('invoice_type', invoiceType)
        .order('payment_date', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      return (data as unknown as InvoicePaymentRow[]) ?? [];
    },
  });
};
