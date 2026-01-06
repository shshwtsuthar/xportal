import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Tables } from '@/database.types';

type GroupWithCapacity = Tables<'groups'> & {
  current_enrollment_count: number;
  max_capacity: number;
};

/**
 * Fetch groups for a specific program at a specific location
 * Used in enrollment flow: Program → Location → Group selection
 */
export const useGetGroupsByLocation = (
  programId?: string,
  locationId?: string
) => {
  return useQuery({
    queryKey: ['groups', 'by-location', programId, locationId],
    queryFn: async (): Promise<GroupWithCapacity[]> => {
      const supabase = createClient();

      let query = supabase
        .from('groups')
        .select('*')
        .order('name', { ascending: true });

      if (programId) {
        query = query.eq('program_id', programId);
      }

      if (locationId) {
        query = query.eq('location_id', locationId);
      }

      const { data, error } = await query;

      if (error) throw new Error(error.message);

      return (data || []) as GroupWithCapacity[];
    },
    enabled: !!programId && !!locationId,
  });
};
