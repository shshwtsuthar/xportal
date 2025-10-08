import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Tables } from '@/database.types';

/**
 * Fetch installments for a payment plan template.
 * @param templateId Template id
 */
export const useGetTemplateInstallments = (templateId?: string) => {
  return useQuery({
    queryKey: ['payment-plan-installments', templateId],
    enabled: !!templateId,
    queryFn: async (): Promise<
      Tables<'payment_plan_template_installments'>[]
    > => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('payment_plan_template_installments')
        .select('*')
        .eq('template_id', templateId!)
        .order('due_date_rule_days', { ascending: true });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
};
