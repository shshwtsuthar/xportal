import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Tables } from '@/database.types';

/**
 * Fetch lines for a payment plan template installment.
 * @param installmentId Installment id
 */
export const useGetTemplateInstallmentLines = (installmentId?: string) => {
  return useQuery({
    queryKey: ['payment-plan-installment-lines', installmentId],
    enabled: !!installmentId,
    queryFn: async (): Promise<
      Tables<'payment_plan_template_installment_lines'>[]
    > => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('payment_plan_template_installment_lines')
        .select('*')
        .eq('installment_id', installmentId!)
        .order('sequence_order', { ascending: true });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
};
