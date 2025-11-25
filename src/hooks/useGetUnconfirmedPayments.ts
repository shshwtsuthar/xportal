import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Tables } from '@/database.types';

type PaymentRow = Tables<'payments'> & {
  invoices?: {
    id: string;
    invoice_number: string | null;
    due_date: string | null;
    enrollments?: {
      student_id: string;
      students?: Pick<
        Tables<'students'>,
        'id' | 'first_name' | 'last_name' | 'student_id_display'
      > | null;
    } | null;
  } | null;
};

/**
 * Fetch payments that have been recorded internally but are not yet confirmed in Xero.
 * Includes basic invoice and student context for display in the Payment Confirmations page.
 */
export const useGetUnconfirmedPayments = () => {
  return useQuery({
    queryKey: ['unconfirmed-payments'],
    queryFn: async (): Promise<PaymentRow[]> => {
      const supabase = createClient();

      let query = supabase
        .from('payments')
        .select(
          `*, invoices:invoice_id (
            id,
            invoice_number,
            due_date,
            enrollments:enrollment_id (
              student_id,
              students:student_id (
                id,
                first_name,
                last_name,
                student_id_display
              )
            )
          )`
        )
        .order('payment_date', { ascending: false });

      // Pending, failed, or not yet attempted (NULL)
      query = query.or(
        'xero_sync_status.is.null,xero_sync_status.eq.pending,xero_sync_status.eq.failed'
      );

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return (data as unknown as PaymentRow[]) ?? [];
    },
  });
};
