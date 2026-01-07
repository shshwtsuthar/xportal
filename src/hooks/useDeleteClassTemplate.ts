import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

/**
 * Delete a class template
 * Note: Generated classes will remain (template_id becomes NULL due to ON DELETE SET NULL)
 */
export const useDeleteClassTemplate = () => {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      templateId,
      programPlanSubjectId,
    }: {
      templateId: string;
      programPlanSubjectId: string;
    }) => {
      const { error } = await supabase
        .from('program_plan_class_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;
      return { templateId, programPlanSubjectId };
    },
    onSuccess: (result) => {
      // Invalidate templates query
      queryClient.invalidateQueries({
        queryKey: ['class-templates', result.programPlanSubjectId],
      });
      // Invalidate classes query (classes will now show template_id = NULL)
      queryClient.invalidateQueries({
        queryKey: ['program-plan-classes', result.programPlanSubjectId],
      });
    },
  });
};
