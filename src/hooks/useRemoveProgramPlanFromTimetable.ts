import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

type RemovePlanPayload = {
  timetable_id: string;
  program_plan_id: string;
};

/**
 * Remove a program plan from a timetable
 */
export const useRemoveProgramPlanFromTimetable = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: RemovePlanPayload): Promise<void> => {
      const supabase = createClient();
      const { error } = await supabase
        .from('timetable_program_plans')
        .delete()
        .eq('timetable_id', payload.timetable_id)
        .eq('program_plan_id', payload.program_plan_id);
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
