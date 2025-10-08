import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

/**
 * Delete a plan subject by id.
 */
export const useDeleteProgramPlanSubject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      id: string;
      programPlanId: string;
    }): Promise<void> => {
      const supabase = createClient();
      const { error } = await supabase
        .from('program_plan_subjects')
        .delete()
        .eq('id', params.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_res, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['programPlanSubjects', variables.programPlanId],
      });
    },
  });
};
