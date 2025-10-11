import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

/**
 * Delete a program plan class
 */
export const useDeleteProgramPlanClass = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (classId: string): Promise<void> => {
      const supabase = createClient();
      const { error } = await supabase
        .from('program_plan_classes')
        .delete()
        .eq('id', classId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programPlanClasses'] });
    },
  });
};
