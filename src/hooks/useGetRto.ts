import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Tables } from '@/database.types';

/**
 * Fetch RTO information.
 */
export const useGetRto = () => {
  return useQuery({
    queryKey: ['rto'],
    queryFn: async (): Promise<Tables<'rtos'> | null> => {
      const supabase = createClient();

      // Get user's RTO from JWT app_metadata
      const { data: userData, error: userError } =
        await supabase.auth.getUser();
      if (userError) throw new Error(userError.message);
      const rtoId = (
        userData.user?.app_metadata as Record<string, unknown> | undefined
      )?.rto_id as string | undefined;
      if (!rtoId) throw new Error('RTO not found in user metadata');

      const { data, error } = await supabase
        .from('rtos')
        .select('*')
        .eq('id', rtoId)
        .single();

      if (error) throw new Error(error.message);
      return data;
    },
  });
};
