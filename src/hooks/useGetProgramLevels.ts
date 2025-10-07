import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

export const useGetProgramLevels = () => {
  return useQuery({
    queryKey: ['program-levels'],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('program_levels')
        .select('id,label')
        .order('id');
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
};
