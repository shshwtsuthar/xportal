import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Tables } from '@/database.types';

/**
 * Fetch list of subjects (formerly units_of_competency).
 * NAT00060: Subjects (Units of Competency) reference data.
 */
export const useGetSubjects = () => {
  return useQuery({
    queryKey: ['subjects'],
    queryFn: async (): Promise<Tables<'subjects'>[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .order('code', { ascending: true });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
};
