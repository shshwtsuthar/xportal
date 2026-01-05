import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Tables } from '@/database.types';

type TimetableWithGroup = Tables<'timetables'> & {
  group: {
    id: string;
    name: string;
    max_capacity: number;
    current_enrollment_count: number;
  } | null;
};

/**
 * Fetch all timetables (optionally filtered by program_id) with group capacity info
 */
export const useGetTimetables = (programId?: string) => {
  return useQuery({
    queryKey: ['timetables', programId ?? 'all'],
    queryFn: async (): Promise<TimetableWithGroup[]> => {
      const supabase = createClient();
      let query = supabase
        .from('timetables')
        .select('*')
        .eq('is_archived', false);

      if (programId) {
        query = query.eq('program_id', programId);
      }

      const { data: timetables, error } = await query.order('name', {
        ascending: true,
      });
      if (error) throw new Error(error.message);

      if (!timetables || timetables.length === 0) {
        return [];
      }

      // For each timetable, fetch its group info via program plans
      const timetablesWithGroups = await Promise.all(
        timetables.map(async (timetable) => {
          // Get the group from the first program plan (they should all be the same)
          const { data: planData } = await supabase
            .from('timetable_program_plans')
            .select(
              `
              program_plans!inner (
                group_id,
                groups (
                  id,
                  name,
                  max_capacity,
                  current_enrollment_count
                )
              )
            `
            )
            .eq('timetable_id', timetable.id)
            .limit(1)
            .single();

          let group = null;
          if (planData) {
            const programPlan = planData.program_plans as unknown as {
              group_id: string | null;
              groups: {
                id: string;
                name: string;
                max_capacity: number;
                current_enrollment_count: number;
              } | null;
            };

            if (programPlan.groups) {
              group = programPlan.groups;
            }
          }

          return {
            ...timetable,
            group,
          };
        })
      );

      return timetablesWithGroups;
    },
  });
};
