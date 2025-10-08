import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Tables } from '@/database.types';

/**
 * Fetch list of agents.
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
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
};
