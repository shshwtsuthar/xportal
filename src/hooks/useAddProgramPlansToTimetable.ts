import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

type AddPlansPayload = {
  timetable_id: string;
  program_plan_ids: string[];
};

/**
 * Add multiple program plans to a timetable.
 * Note: Program plans are now generalized and can span multiple groups.
 * Group assignment happens at the class level.
 */
export const useAddProgramPlansToTimetable = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: AddPlansPayload): Promise<void> => {
      const supabase = createClient();

      // Validate that program plans exist
      const { data: programPlans, error: fetchError } = await supabase
        .from('program_plans')
        .select('id, name')
        .in('id', payload.program_plan_ids);

      if (fetchError) throw new Error(fetchError.message);

      if (!programPlans || programPlans.length === 0) {
        throw new Error('No valid program plans found');
      }

      // Proceed with insert
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
