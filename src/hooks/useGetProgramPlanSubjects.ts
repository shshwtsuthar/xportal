import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Tables } from '@/database.types';

/**
 * Fetch subjects for a given program plan id.
 */
export const useGetProgramPlanSubjects = (programPlanId?: string) => {
  return useQuery({
    queryKey: ['programPlanSubjects', programPlanId ?? 'none'],
    queryFn: async (): Promise<Tables<'program_plan_subjects'>[]> => {
      console.log(
        'useGetProgramPlanSubjects: Fetching subjects for programPlanId:',
        programPlanId
      );
      if (!programPlanId) return [];
      const supabase = createClient();
      const { data, error } = await supabase
        .from('program_plan_subjects')
        .select('*')
        .eq('program_plan_id', programPlanId)
        .order('start_date', { ascending: true });
      if (error) {
        console.error('useGetProgramPlanSubjects: Database error:', error);
        throw new Error(error.message);
      }
      console.log(
        'useGetProgramPlanSubjects: Retrieved subjects:',
        data?.length || 0
      );
      return data ?? [];
    },
    enabled: !!programPlanId,
  });
};
