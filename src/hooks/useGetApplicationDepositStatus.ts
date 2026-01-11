import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

type DepositStatus = {
  hasDeposits: boolean;
  allDepositsPaid: boolean;
  unpaidCount: number;
  totalDue: number;
  totalPaid: number;
};

/**
 * Check if all deposits for an application are fully paid.
 * Used to determine if the Accept button should be enabled.
 */
export const useGetApplicationDepositStatus = (applicationId?: string) => {
  return useQuery({
    queryKey: ['application-deposit-status', applicationId ?? 'none'],
    enabled: Boolean(applicationId),
    queryFn: async (): Promise<DepositStatus> => {
      if (!applicationId) {
        return {
          hasDeposits: false,
          allDepositsPaid: true,
          unpaidCount: 0,
          totalDue: 0,
          totalPaid: 0,
        };
      }

      const supabase = createClient();
      const { data, error } = await supabase
        .from('application_deposit_invoices')
        .select('amount_due_cents, amount_paid_cents')
        .eq('application_id', applicationId);

      if (error) throw new Error(error.message);

      if (!data || data.length === 0) {
        return {
          hasDeposits: false,
          allDepositsPaid: true,
          unpaidCount: 0,
          totalDue: 0,
          totalPaid: 0,
        };
      }

      const totalDue = data.reduce((sum, d) => sum + d.amount_due_cents, 0);
      const totalPaid = data.reduce((sum, d) => sum + d.amount_paid_cents, 0);
      const unpaidCount = data.filter(
        (d) => d.amount_paid_cents < d.amount_due_cents
      ).length;

      return {
        hasDeposits: true,
        allDepositsPaid: unpaidCount === 0,
        unpaidCount,
        totalDue,
        totalPaid,
      };
    },
  });
};
