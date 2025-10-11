import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Tables } from '@/database.types';

/**
 * Fetch list of classrooms for a specific location.
 * @param locationId The location UUID string
 * @returns TanStack Query result with classrooms data
 */
export const useGetClassrooms = (locationId?: string) => {
  return useQuery({
    queryKey: ['classrooms', locationId],
    enabled: Boolean(locationId),
    queryFn: async (): Promise<Tables<'classrooms'>[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('classrooms')
        .select('*')
        .eq('location_id', locationId!)
        .order('name', { ascending: true });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
};
