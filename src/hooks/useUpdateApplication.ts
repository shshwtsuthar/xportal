import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Tables } from '@/database.types';

type UpdatePayload = Partial<Tables<'applications'>> & { id: string };

/**
 * Update application draft fields and return the updated row.
 * Also writes the fresh row into cache to avoid stale UI after save.
 */
export const useUpdateApplication = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      payload: UpdatePayload
    ): Promise<Tables<'applications'>> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('applications')
        .update(payload)
        .eq('id', payload.id)
        .select('*')
        .single();
      if (error) throw new Error(error.message);
      return data as Tables<'applications'>;
    },
    onSuccess: (data, variables) => {
      // Optimistically write the updated row to the cache
      queryClient.setQueryData(['application', variables.id], data);
      // Invalidate lists to refresh aggregates/views
      queryClient.invalidateQueries({ queryKey: ['applications'] });
    },
  });
};
