import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Tables } from '@/database.types';
import { queryKeys } from '@/src/lib/queryKeys';

/**
 * Fetch disabilities for a specific application
 */
export const useGetApplicationDisabilities = (applicationId?: string) => {
  return useQuery({
    queryKey: queryKeys.applicationDisabilities(applicationId || ''),
    queryFn: async (): Promise<Tables<'application_disabilities'>[]> => {
      if (!applicationId) return [];
      const supabase = createClient();
      const { data, error } = await supabase
        .from('application_disabilities')
        .select('*')
        .eq('application_id', applicationId);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    enabled: !!applicationId,
  });
};

/**
 * Fetch prior education for a specific application
 */
export const useGetApplicationPriorEducation = (applicationId?: string) => {
  return useQuery({
    queryKey: queryKeys.applicationPriorEducation(applicationId || ''),
    queryFn: async (): Promise<Tables<'application_prior_education'>[]> => {
      if (!applicationId) return [];
      const supabase = createClient();
      const { data, error } = await supabase
        .from('application_prior_education')
        .select('*')
        .eq('application_id', applicationId);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    enabled: !!applicationId,
  });
};
