import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

type AddPlansPayload = {
  timetable_id: string;
  program_plan_ids: string[];
};

/**
 * Add multiple program plans to a timetable
 */
export const useAddProgramPlansToTimetable = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: AddPlansPayload): Promise<void> => {
      const supabase = createClient();
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
    },
  });
};
