import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Tables } from '@/database.types';

type UpdatePayload = Partial<Tables<'applications'>> & { id: string };

/**
 * Update application draft fields. Invalidates the single-application query.
 */
export const useUpdateApplication = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UpdatePayload): Promise<void> => {
      const supabase = createClient();
      const { error } = await supabase
        .from('applications')
        .update(payload)
        .eq('id', payload.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_, variables) => {
      // Invalidate both the specific application and the applications list
      queryClient.invalidateQueries({
        queryKey: ['application', variables.id],
      });
      queryClient.invalidateQueries({ queryKey: ['applications'] });
    },
  });
};
