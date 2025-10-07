import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

export const useGetProgramFields = () => {
  return useQuery({
    queryKey: ['program-fields'],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('program_fields')
        .select('id,label')
        .order('id');
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
};
