import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

type PreviewDate = {
  generated_date: string;
  is_blackout_date: boolean;
  blackout_reason: string | null;
};

/**
 * Preview dates that would be generated from template expansion
 * Used for showing users what classes will be created before saving
 */
export const usePreviewTemplateExpansion = (templateId: string | undefined) => {
  const supabase = createClient();

  return useQuery({
    queryKey: ['template-preview', templateId],
    queryFn: async () => {
      if (!templateId) {
        return [];
      }

      const { data, error } = await supabase.rpc('preview_template_expansion', {
        p_template_id: templateId,
      });

      if (error) throw error;
      return (data || []) as PreviewDate[];
    },
    enabled: !!templateId,
  });
};
