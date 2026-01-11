import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Tables } from '@/database.types';

type ApplicationWithDeposits = Tables<'applications'> & {
  programs?: Pick<Tables<'programs'>, 'name'> | null;
  payment_plan_templates?: Pick<
    Tables<'payment_plan_templates'>,
    'name'
  > | null;
  deposit_summary?: {
    total_due: number;
    total_paid: number;
    unpaid_count: number;
  };
};

/**
 * Fetch applications that have deposit requirements (payment plan with at least one deposit installment).
 * Returns applications with their deposit summary information.
 */
export const useGetApplicationsWithDeposits = () => {
  return useQuery({
    queryKey: ['applications-with-deposits'],
    queryFn: async (): Promise<ApplicationWithDeposits[]> => {
      const supabase = createClient();

      // First get all applications that have deposit invoices
      const { data: applicationsWithDepositInvoices, error: appError } =
        await supabase
          .from('application_deposit_invoices')
          .select('application_id')
          .order('application_id');

      if (appError) throw new Error(appError.message);

      if (
        !applicationsWithDepositInvoices ||
        applicationsWithDepositInvoices.length === 0
      ) {
        return [];
      }

      // Get unique application IDs
      const applicationIds = Array.from(
        new Set(applicationsWithDepositInvoices.map((d) => d.application_id))
      );

      // Fetch full application details
      const { data: applications, error: detailsError } = await supabase
        .from('applications')
        .select('*, programs(name), payment_plan_templates(name)')
        .in('id', applicationIds)
        .order('updated_at', { ascending: false });

      if (detailsError) throw new Error(detailsError.message);

      // Fetch deposit summaries for each application
      const { data: depositInvoices, error: depositError } = await supabase
        .from('application_deposit_invoices')
        .select('application_id, amount_due_cents, amount_paid_cents, status')
        .in('application_id', applicationIds);

      if (depositError) throw new Error(depositError.message);

      // Group deposits by application
      const depositsByApp = new Map<
        string,
        { total_due: number; total_paid: number; unpaid_count: number }
      >();

      (depositInvoices ?? []).forEach((dep) => {
        const existing = depositsByApp.get(dep.application_id) || {
          total_due: 0,
          total_paid: 0,
          unpaid_count: 0,
        };

        existing.total_due += dep.amount_due_cents;
        existing.total_paid += dep.amount_paid_cents;
        if (dep.amount_paid_cents < dep.amount_due_cents) {
          existing.unpaid_count++;
        }

        depositsByApp.set(dep.application_id, existing);
      });

      // Combine data
      return (applications ?? []).map((app) => ({
        ...app,
        deposit_summary: depositsByApp.get(app.id),
      }));
    },
  });
};
