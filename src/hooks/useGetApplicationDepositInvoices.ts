import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Tables } from '@/database.types';

type DepositInvoice = Tables<'application_deposit_invoices'>;

/**
 * Fetch deposit invoices for a specific application.
 * These are the instalments that must be paid before application acceptance.
 */
export const useGetApplicationDepositInvoices = (applicationId?: string) => {
  return useQuery({
    queryKey: ['application-deposit-invoices', applicationId ?? 'none'],
    enabled: Boolean(applicationId),
    queryFn: async (): Promise<DepositInvoice[]> => {
      if (!applicationId) return [];

      const supabase = createClient();
      const { data, error } = await supabase
        .from('application_deposit_invoices')
        .select('*')
        .eq('application_id', applicationId)
        .order('due_date', { ascending: true });

      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
};
