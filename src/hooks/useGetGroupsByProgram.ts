import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Tables } from '@/database.types';

/**
 * Fetch groups filtered by program_id
 */
export const useGetGroupsByProgram = (programId?: string) => {
  return useQuery({
    queryKey: ['groups', 'by-program', programId ?? 'all'],
    queryFn: async (): Promise<Tables<'groups'>[]> => {
      const supabase = createClient();
      let query = supabase
        .from('groups')
        .select('*')
        .order('name', { ascending: true });

      if (programId) {
        query = query.eq('program_id', programId);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    enabled: !!programId, // Only run query if programId is provided
  });
};
