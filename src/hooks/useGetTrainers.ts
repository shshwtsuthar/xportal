import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Tables } from '@/database.types';

/**
 * Fetch all users with trainer-related roles (TRAINER or ACADEMIC_HEAD).
 * Used for populating trainer dropdowns in program plan creation.
 */
export const useGetTrainers = () => {
  return useQuery({
    queryKey: ['trainers'],
    queryFn: async (): Promise<Tables<'profiles'>[]> => {
      console.log('useGetTrainers: Fetching trainers');
      const supabase = createClient();
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .in('role', ['TRAINER', 'ACADEMIC_HEAD'])
        .order('first_name', { ascending: true });
      if (error) {
        console.error('useGetTrainers: Database error:', error);
        throw new Error(error.message);
      }
      console.log('useGetTrainers: Retrieved trainers:', data?.length || 0);
      return data ?? [];
    },
  });
};
