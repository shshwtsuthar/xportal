import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Tables } from '@/database.types';

/**
 * Fetch list of classrooms for a specific location, or all classrooms if no locationId provided.
 * @param locationId The location UUID string (optional)
 * @returns TanStack Query result with classrooms data
 */
export const useGetClassrooms = (locationId?: string) => {
  return useQuery({
    queryKey: ['classrooms', locationId ?? 'all'],
    queryFn: async (): Promise<Tables<'classrooms'>[]> => {
      const supabase = createClient();
      let query = supabase.from('classrooms').select('*');

      if (locationId) {
        query = query.eq('location_id', locationId);
      }

      const { data, error } = await query.order('name', { ascending: true });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
};
