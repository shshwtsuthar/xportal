import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Tables } from '@/database.types';

/**
 * Fetch a single student by id with core identity fields.
 */
export const useGetStudentById = (id: string) => {
  return useQuery({
    queryKey: ['student', id],
    enabled: Boolean(id),
    queryFn: async (): Promise<Tables<'students'>> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('id', id)
        .single();
      if (error) {
        throw new Error(error.message);
      }
      return data as Tables<'students'>;
    },
  });
};
