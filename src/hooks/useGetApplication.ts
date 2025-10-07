import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Tables } from '@/database.types';

export const useGetApplication = (id?: string) => {
  return useQuery({
    queryKey: ['application', id],
    enabled: !!id,
    queryFn: async (): Promise<Tables<'applications'>> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .eq('id', id!)
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
  });
};
