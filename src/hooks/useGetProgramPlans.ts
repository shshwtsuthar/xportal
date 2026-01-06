import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Tables } from '@/database.types';

export type ProgramPlanWithGroup = Tables<'program_plans'>;

/**
 * Fetch program plans, optionally filtered by programId.
 * Note: Program plans are now generalized - group assignment happens at the class level.
 */
export const useGetProgramPlans = (programId?: string) => {
  return useQuery({
    queryKey: ['programPlans', programId ?? 'all'],
    queryFn: async (): Promise<ProgramPlanWithGroup[]> => {
      const supabase = createClient();
      let query = supabase.from('program_plans').select('*');
      if (programId) query = query.eq('program_id', programId);
      const { data, error } = await query.order('name', { ascending: true });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
};
