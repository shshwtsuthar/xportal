import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Tables } from '@/database.types';

/**
 * Fetch list of agents for the current RTO context.
 * @returns TanStack Query result of agents ordered by name
 */
export const useGetAgents = () => {
  return useQuery({
    queryKey: ['agents'],
    queryFn: async (): Promise<Tables<'agents'>[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .order('name', { ascending: true });
      if (error) {
        throw new Error(error.message);
      }
      return data ?? [];
    },
  });
};
