import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Tables } from '@/database.types';

/**
 * Fetch all timetables (optionally filtered by program_id)
 */
export const useGetTimetables = (programId?: string) => {
  return useQuery({
    queryKey: ['timetables', programId ?? 'all'],
    queryFn: async (): Promise<Tables<'timetables'>[]> => {
      const supabase = createClient();
      let query = supabase
        .from('timetables')
        .select('*')
        .eq('is_archived', false);

      if (programId) {
        query = query.eq('program_id', programId);
      }

      const { data, error } = await query.order('name', { ascending: true });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
};
