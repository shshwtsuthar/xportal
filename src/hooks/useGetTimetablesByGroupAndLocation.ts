import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Tables } from '@/database.types';

// Extended timetable type with nested relations
type TimetableWithProgramPlans = Tables<'timetables'> & {
  timetable_program_plans: TimetableProgramPlanRelation[];
};

// Type for timetable_program_plans relation when selecting only program_plan_id
type TimetableProgramPlanRelation = {
  program_plan_id: string;
};

/**
 * Fetch timetables that contain classes for a specific group at a specific location
 * Used in enrollment flow after Group selection to show only valid timetables
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

      // Get timetables that:
      // 1. Belong to the selected program
      // 2. Contain program plans with classes for the selected group at the selected location
      const { data, error } = await supabase
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
        .order('name', { ascending: true });

      if (error) throw new Error(error.message);

      if (!data || data.length === 0) {
        return [];
      }

      // Filter timetables that have at least one class for the selected group at the selected location
      const timetablesWithValidClasses = await Promise.all(
        data.map(async (timetable) => {
          // Check if this timetable has any classes for the group+location combination
          const { data: classData, error: classError } = await supabase
            .from('program_plan_classes')
            .select(
              `
              id,
              program_plan_subjects!inner (
                program_plan_id
              )
            `
            )
            .eq('group_id', groupId!)
            .eq('location_id', locationId!)
            .in(
              'program_plan_subjects.program_plan_id',
              (
                timetable.timetable_program_plans as TimetableProgramPlanRelation[]
              ).map((tpp) => tpp.program_plan_id)
            )
            .limit(1);

          if (classError) {
            console.error('Error checking classes:', classError);
            return null;
          }

          // Only include this timetable if it has valid classes
          if (classData && classData.length > 0) {
            return timetable;
          }

          return null;
        })
      );

      // Filter out nulls and return only timetables with valid classes (without the nested relation)
      return timetablesWithValidClasses
        .filter((t): t is TimetableWithProgramPlans => t !== null)
        .map(({ timetable_program_plans, ...timetable }) => timetable);
    },
    enabled: !!programId && !!groupId && !!locationId,
  });
};
