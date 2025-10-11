import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Tables } from '@/database.types';

/**
 * Fetch a single location by ID.
 * @param locationId The location UUID string
 * @returns TanStack Query result with location data
 */
export const useGetLocation = (locationId?: string) => {
  return useQuery({
    queryKey: ['location', locationId],
    enabled: Boolean(locationId),
    queryFn: async (): Promise<Tables<'delivery_locations'> | null> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('delivery_locations')
        .select('*')
        .eq('id', locationId!)
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
  });
};
