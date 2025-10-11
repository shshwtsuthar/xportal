import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Tables } from '@/database.types';

/**
 * Fetch classes for a given program plan subject id.
 */
export const useGetProgramPlanClasses = (programPlanSubjectId?: string) => {
  return useQuery({
    queryKey: ['programPlanClasses', programPlanSubjectId ?? 'none'],
    queryFn: async (): Promise<Tables<'program_plan_classes'>[]> => {
      console.log(
        'useGetProgramPlanClasses: Fetching classes for programPlanSubjectId:',
        programPlanSubjectId
      );
      if (!programPlanSubjectId) return [];
      const supabase = createClient();
      const { data, error } = await supabase
        .from('program_plan_classes')
        .select('*')
        .eq('program_plan_subject_id', programPlanSubjectId)
        .order('class_date', { ascending: true });
      if (error) {
        console.error('useGetProgramPlanClasses: Database error:', error);
        throw new Error(error.message);
      }
      console.log(
        'useGetProgramPlanClasses: Retrieved classes:',
        data?.length || 0
      );
      return data ?? [];
    },
    enabled: !!programPlanSubjectId,
  });
};
