import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Tables } from '@/database.types';

type ApplicationInvoiceRow = Tables<'application_invoices'>;

/**
 * Fetch application invoices for a specific application.
 * Only returns invoices that haven't been migrated to enrollment.
 */
export const useGetApplicationInvoicesByApplication = (
  applicationId: string
) => {
  return useQuery({
    queryKey: ['application-invoices', applicationId],
    queryFn: async (): Promise<ApplicationInvoiceRow[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('application_invoices')
        .select('*')
        .eq('application_id', applicationId)
        .eq('migrated_to_enrollment', false)
        .order('due_date', { ascending: true });

      if (error) throw new Error(error.message);
      return (data as unknown as ApplicationInvoiceRow[]) ?? [];
    },
    enabled: !!applicationId,
  });
};
