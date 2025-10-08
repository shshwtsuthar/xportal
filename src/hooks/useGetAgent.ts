import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Tables } from '@/database.types';

/**
 * Fetch a single agent by ID.
 * @param agentId The agent UUID string
 * @returns TanStack Query result with agent data
 */
export const useGetAgent = (agentId?: string) => {
  return useQuery({
    queryKey: ['agent', agentId],
    enabled: Boolean(agentId),
    queryFn: async (): Promise<Tables<'agents'> | null> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .eq('id', agentId!)
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
  });
};
