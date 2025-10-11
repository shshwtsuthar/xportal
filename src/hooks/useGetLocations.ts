import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Tables } from '@/database.types';

/**
 * Fetch list of locations.
 */
export const useGetLocations = () => {
  return useQuery({
    queryKey: ['locations'],
    queryFn: async (): Promise<Tables<'delivery_locations'>[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('delivery_locations')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
};
