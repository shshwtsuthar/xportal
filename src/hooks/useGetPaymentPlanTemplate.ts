import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Tables } from '@/database.types';

/**
 * Fetch a single payment plan template by ID.
 * @param templateId Template id
 */
export const useGetPaymentPlanTemplate = (templateId?: string) => {
  return useQuery({
    queryKey: ['payment-plan-template', templateId],
    enabled: !!templateId,
    queryFn: async (): Promise<Tables<'payment_plan_templates'> | null> => {
      if (!templateId) return null;
      const supabase = createClient();
      const { data, error } = await supabase
        .from('payment_plan_templates')
        .select('*')
        .eq('id', templateId)
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
  });
};
