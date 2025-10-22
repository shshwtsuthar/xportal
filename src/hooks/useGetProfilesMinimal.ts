import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Tables } from '@/database.types';

/**
 * Fetch minimal profile data for dropdowns (id, first_name, last_name).
 */
export const useGetProfilesMinimal = () => {
  return useQuery({
    queryKey: ['profiles-minimal'],
    queryFn: async (): Promise<
      Pick<Tables<'profiles'>, 'id' | 'first_name' | 'last_name'>[]
    > => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .order('first_name', { ascending: true });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
};
