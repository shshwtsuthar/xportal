import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Tables } from '@/database.types';

/**
 * Fetch applications with optional status filter.
 * @param status optional application status to filter by
 * @returns TanStack Query result with list of applications
 */
type ApplicationStatus =
  import('@/database.types').Database['public']['Enums']['application_status'];

type ApplicationWithAgent = Tables<'applications'> & {
  agents?: Pick<Tables<'agents'>, 'name'> | null;
};

export const useGetApplications = (status?: ApplicationStatus) => {
  return useQuery({
    queryKey: ['applications', status ?? 'all'],
    queryFn: async (): Promise<ApplicationWithAgent[]> => {
      const supabase = createClient();
      let query = supabase
        .from('applications')
        .select('*, agents(name)')
        .order('updated_at', { ascending: false });
      if (status) {
        query = query.eq('status', status);
      }
      const { data, error } = await query;
      if (error) {
        throw new Error(error.message);
      }
      return data ?? [];
    },
  });
};
