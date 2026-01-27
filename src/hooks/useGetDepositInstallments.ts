import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

type DepositInstallment = {
  id: string;
  name: string;
  amount_cents: number;
  due_date: string;
  template_installment_id: string;
};

/**
 * Fetch deposit installments from application payment schedule.
 * Only returns installments marked as is_deposit = true.
 */
export const useGetDepositInstallments = (applicationId: string) => {
  return useQuery({
    queryKey: ['deposit-installments', applicationId],
    queryFn: async (): Promise<DepositInstallment[]> => {
      const supabase = createClient();

      // Get payment schedule entries
      const { data: scheduleEntries, error: scheduleErr } = await supabase
        .from('application_payment_schedule')
        .select('id, name, amount_cents, due_date, template_installment_id')
        .eq('application_id', applicationId);

      if (scheduleErr) throw new Error(scheduleErr.message);
      if (!scheduleEntries || scheduleEntries.length === 0) return [];

      // Get installment IDs
      const installmentIds = scheduleEntries
        .map((s) => s.template_installment_id)
        .filter(Boolean) as string[];

      if (installmentIds.length === 0) return [];

      // Get installments to check is_deposit
      const { data: installments, error: installmentsErr } = await supabase
        .from('payment_plan_template_installments')
        .select('id, is_deposit')
        .in('id', installmentIds);

      if (installmentsErr) throw new Error(installmentsErr.message);
      if (!installments || installments.length === 0) return [];

      // Create map of installment_id -> is_deposit
      const depositMap = new Map<string, boolean>();
      installments.forEach((inst) => {
        depositMap.set(inst.id, inst.is_deposit === true);
      });

      // Filter to only deposits
      const deposits = scheduleEntries.filter((sched) => {
        const isDeposit = depositMap.get(sched.template_installment_id);
        return isDeposit === true;
      }) as DepositInstallment[];

      return deposits.sort((a, b) => {
        const dateA = new Date(a.due_date).getTime();
        const dateB = new Date(b.due_date).getTime();
        return dateA - dateB;
      });
    },
    enabled: !!applicationId,
  });
};
