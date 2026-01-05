import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

/**
 * Get the maximum classroom capacity available for the current RTO.
 * Only considers classrooms with status 'AVAILABLE'.
 */
export const useGetMaxClassroomCapacity = () => {
  return useQuery({
    queryKey: ['classrooms', 'maxCapacity'],
    queryFn: async (): Promise<number> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('classrooms')
        .select('capacity')
        .eq('status', 'AVAILABLE')
        .order('capacity', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        // If no classrooms exist, return 0
        if (error.code === 'PGRST116') return 0;
        throw new Error(error.message);
      }

      return data?.capacity ?? 0;
    },
  });
};
