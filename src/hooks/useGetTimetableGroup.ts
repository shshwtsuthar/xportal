import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

type TimetableGroup = {
  groupId: string;
  groupName: string;
  maxCapacity: number;
  currentEnrollment: number;
  programId: string;
} | null;

/**
 * Derive the group of a timetable from its associated program plans
 * Returns null if timetable has no program plans or plans have no group
 */
export const useGetTimetableGroup = (timetableId?: string) => {
  return useQuery({
    queryKey: ['timetables', timetableId, 'group'],
    queryFn: async (): Promise<TimetableGroup> => {
      const supabase = createClient();

      // Get the first program plan's group (they should all be the same due to validation)
      const { data, error } = await supabase
        .from('timetable_program_plans')
        .select(
          `
          program_plan_id,
          program_plans!inner (
            group_id,
            groups!inner (
              id,
              name,
              max_capacity,
              current_enrollment_count,
              program_id
            )
          )
        `
        )
        .eq('timetable_id', timetableId!)
        .limit(1)
        .single();

      if (error || !data) {
        // No program plans or error - return null
        return null;
      }

      // Type assertion for nested data
      const programPlan = data.program_plans as unknown as {
        group_id: string | null;
        groups: {
          id: string;
          name: string;
          max_capacity: number;
          current_enrollment_count: number;
          program_id: string;
        } | null;
      };

      if (!programPlan.groups) {
        return null;
      }

      return {
        groupId: programPlan.groups.id,
        groupName: programPlan.groups.name,
        maxCapacity: programPlan.groups.max_capacity,
        currentEnrollment: programPlan.groups.current_enrollment_count,
        programId: programPlan.groups.program_id,
      };
    },
    enabled: !!timetableId,
  });
};
