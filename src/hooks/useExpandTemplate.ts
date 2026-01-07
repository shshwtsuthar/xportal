import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

export type ExpandTemplateResult = {
  success: boolean;
  error?: string;
  classes_created?: number;
  classes_preserved?: number;
  blackout_dates_skipped?: number;
  total_classes?: number;
  conflicts?: Array<{
    class_id: string;
    class_date: string;
    start_time: string;
    end_time: string;
    conflict_reason: string;
    edited_fields?: string[];
  }>;
};

/**
 * Expand a class template to concrete class instances
 */
export const useExpandTemplate = () => {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      templateId,
      preserveEdited = true,
      programPlanSubjectId: _programPlanSubjectId, // eslint-disable-line @typescript-eslint/no-unused-vars
    }: {
      templateId: string;
      preserveEdited?: boolean;
      programPlanSubjectId: string;
    }) => {
      const { data, error } = await supabase.rpc('expand_class_template', {
        p_template_id: templateId,
        p_preserve_edited: preserveEdited,
      });

      if (error) throw error;
      return data as ExpandTemplateResult;
    },
    onSuccess: (_, variables) => {
      // Invalidate templates query
      queryClient.invalidateQueries({
        queryKey: ['class-templates', variables.programPlanSubjectId],
      });
      // Invalidate classes query
      queryClient.invalidateQueries({
        queryKey: ['program-plan-classes', variables.programPlanSubjectId],
      });
    },
  });
};
