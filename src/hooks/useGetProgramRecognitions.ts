import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

export const useGetProgramRecognitions = () => {
  return useQuery({
    queryKey: ['program-recognitions'],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('program_recognitions')
        .select('id,label')
        .order('id');
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
};
