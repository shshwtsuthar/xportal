import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Tables } from '@/database.types';

/**
 * Fetch program plans, optionally filtered by programId.
 */
export const useGetProgramPlans = (programId?: string) => {
  return useQuery({
    queryKey: ['programPlans', programId ?? 'all'],
    queryFn: async (): Promise<Tables<'program_plans'>[]> => {
      const supabase = createClient();
      let query = supabase.from('program_plans').select('*');
      if (programId) query = query.eq('program_id', programId);
      const { data, error } = await query.order('name', { ascending: true });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
};
