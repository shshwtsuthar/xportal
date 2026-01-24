import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Tables } from '@/database.types';

/**
 * Fetch timetables that contain classes for a specific group at a specific location
 * Used in enrollment flow after Group selection to show only valid timetables
 *
 * Optimized to avoid N+1 queries by fetching all necessary data in a single query
 */
export const useGetTimetablesByGroupAndLocation = (
  programId?: string,
  groupId?: string,
  locationId?: string
) => {
  return useQuery({
    queryKey: [
      'timetables',
      'by-group-location',
      programId,
      groupId,
      locationId,
    ],
    queryFn: async (): Promise<Tables<'timetables'>[]> => {
      const supabase = createClient();

      // Step 1: Get all program plan IDs that have classes for this group and location
      const { data: validProgramPlanIds, error: planError } = await supabase
        .from('program_plan_classes')
        .select('program_plan_subjects!inner(program_plan_id)')
        .eq('group_id', groupId!)
        .eq('location_id', locationId!);

      if (planError) throw new Error(planError.message);

      // Extract unique program plan IDs
      const programPlanIdSet = new Set<string>();
      validProgramPlanIds?.forEach(
        (item: { program_plan_subjects?: { program_plan_id: string } }) => {
          if (item.program_plan_subjects?.program_plan_id) {
            programPlanIdSet.add(item.program_plan_subjects.program_plan_id);
          }
        }
      );

      const uniqueProgramPlanIds = Array.from(programPlanIdSet);

      // If no valid program plans found, return empty array
      if (uniqueProgramPlanIds.length === 0) {
        return [];
      }

      // Step 2: Get timetables that include these program plans (single query)
      const { data: timetables, error: timetableError } = await supabase
        .from('timetables')
        .select(
          `
          *,
          timetable_program_plans!inner (
            program_plan_id
          )
        `
        )
        .eq('program_id', programId!)
        .eq('is_archived', false)
        .in('timetable_program_plans.program_plan_id', uniqueProgramPlanIds)
        .order('name', { ascending: true });

      if (timetableError) throw new Error(timetableError.message);

      if (!timetables || timetables.length === 0) {
        return [];
      }

      // Remove duplicate timetables (since a timetable can have multiple program plans)
      const uniqueTimetables = Array.from(
        new Map(
          timetables.map((t) => {
            // Extract only the timetable fields (remove nested relations)
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { timetable_program_plans, ...timetableFields } = t;
            return [t.id, timetableFields as Tables<'timetables'>];
          })
        ).values()
      );

      return uniqueTimetables;
    },
    enabled: !!programId && !!groupId && !!locationId,
  });
};
