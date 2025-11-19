import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Tables } from '@/database.types';

type ApplicationWithAgent = Tables<'applications'> & {
  agents?: Pick<Tables<'agents'>, 'id' | 'name' | 'contact_email'> | null;
};

/**
 * useGetApplicationWithAgent
 * Fetches a single application with agent data including contact_email.
 * @param applicationId UUID of the application to fetch.
 * @returns TanStack Query result with application data including agent contact_email.
 */
export const useGetApplicationWithAgent = (applicationId?: string) => {
  return useQuery({
    queryKey: ['application-with-agent', applicationId],
    enabled: Boolean(applicationId),
    queryFn: async (): Promise<ApplicationWithAgent | null> => {
      if (!applicationId) return null;
      const supabase = createClient();
      const { data, error } = await supabase
        .from('applications')
        .select('*, agents:agent_id(id, name, contact_email)')
        .eq('id', applicationId)
        .single();
      if (error) {
        throw new Error(error.message);
      }
      return data;
    },
  });
};
