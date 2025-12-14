import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Tables } from '@/database.types';

type ProgramPlanClassWithLocation = Tables<'program_plan_classes'> & {
  delivery_locations: Pick<Tables<'delivery_locations'>, 'name'> | null;
  classrooms: Pick<Tables<'classrooms'>, 'name'> | null;
  profiles: Pick<Tables<'profiles'>, 'first_name' | 'last_name'> | null;
};

/**
 * Fetch classes for a given program plan subject id.
 * Includes location and classroom details for display.
 */
export const useGetProgramPlanClasses = (programPlanSubjectId?: string) => {
  return useQuery({
    queryKey: ['programPlanClasses', programPlanSubjectId ?? 'none'],
    queryFn: async (): Promise<ProgramPlanClassWithLocation[]> => {
      console.log(
        'useGetProgramPlanClasses: Fetching classes for programPlanSubjectId:',
        programPlanSubjectId
      );
      if (!programPlanSubjectId) return [];
      const supabase = createClient();
      const { data, error } = await supabase
        .from('program_plan_classes')
        .select(
          `
          *,
          delivery_locations(
            name
          ),
          classrooms(
            name
          ),
          profiles(
            first_name,
            last_name
          )
        `
        )
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
      return (data ?? []) as ProgramPlanClassWithLocation[];
    },
    enabled: !!programPlanSubjectId,
  });
};
