import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Tables } from '@/database.types';

/**
 * Fetch all groups for the current RTO.
 */
export const useGetGroups = () => {
  return useQuery({
    queryKey: ['groups'],
    queryFn: async (): Promise<Tables<'groups'>[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
};
