import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Tables } from '@/database.types';

/**
 * Fetch payment plan templates for a given program, or all templates if programId is 'all'.
 * @param programId Program id to filter templates, or 'all' to fetch all
 */
export const useGetPaymentPlanTemplates = (programId?: string) => {
  return useQuery({
    queryKey: ['payment-plan-templates', programId],
    enabled: !!programId,
    queryFn: async (): Promise<Tables<'payment_plan_templates'>[]> => {
      const supabase = createClient();
      let query = supabase.from('payment_plan_templates').select('*');
      if (programId !== 'all') {
        query = query.eq('program_id', programId!);
      }
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
};
