import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Tables } from '@/database.types';

/**
 * Fetch list of programs.
 */
export const useGetPrograms = () => {
  return useQuery({
    queryKey: ['programs'],
    queryFn: async (): Promise<Tables<'programs'>[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
};
