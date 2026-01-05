import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

type AddPlansPayload = {
  timetable_id: string;
  program_plan_ids: string[];
};

/**
 * Add multiple program plans to a timetable with group validation
 */
export const useAddProgramPlansToTimetable = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: AddPlansPayload): Promise<void> => {
      const supabase = createClient();

      // Validate that all program plans have groups and belong to the same group
      const { data: programPlans, error: fetchError } = await supabase
        .from('program_plans')
        .select('id, group_id, name')
        .in('id', payload.program_plan_ids);

      if (fetchError) throw new Error(fetchError.message);

      // Check for program plans without groups
      const plansWithoutGroups = programPlans?.filter((p) => !p.group_id) ?? [];
      if (plansWithoutGroups.length > 0) {
        throw new Error(
          `Cannot add program plans without groups: ${plansWithoutGroups.map((p) => p.name).join(', ')}`
        );
      }

      // Check for multiple different groups
      const uniqueGroups = new Set(programPlans?.map((p) => p.group_id));
      if (uniqueGroups.size > 1) {
        throw new Error(
          'Cannot add program plans from different groups to the same timetable'
        );
      }

      // If timetable already has program plans, validate group consistency
      const { data: existingPlans } = await supabase
        .from('timetable_program_plans')
        .select('program_plans!inner(group_id)')
        .eq('timetable_id', payload.timetable_id)
        .limit(1)
        .single();

      if (existingPlans) {
        const existingGroup = (
          existingPlans.program_plans as unknown as { group_id: string }
        ).group_id;
        const newGroup = Array.from(uniqueGroups)[0];
        if (existingGroup !== newGroup) {
          throw new Error(
            'Cannot add program plans from a different group. This timetable already contains plans from another group.'
          );
        }
      }

      // All validations passed, proceed with insert
      const { error } = await supabase.from('timetable_program_plans').insert(
        payload.program_plan_ids.map((planId) => ({
          timetable_id: payload.timetable_id,
          program_plan_id: planId,
        }))
      );
      if (error) throw new Error(error.message);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['timetables', variables.timetable_id],
      });
      queryClient.invalidateQueries({ queryKey: ['program-plans'] });
      queryClient.invalidateQueries({ queryKey: ['timetables'] });
    },
  });
};
