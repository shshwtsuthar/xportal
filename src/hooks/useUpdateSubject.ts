import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Tables } from '@/database.types';

type UpdatePayload = {
  id: string;
} & Partial<Tables<'subjects'>>;

/**
 * Update a subject record.
 */
export const useUpdateSubject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UpdatePayload): Promise<Tables<'subjects'>> => {
      const supabase = createClient();
      const { id, ...updateData } = payload;

      const { data, error } = await supabase
        .from('subjects')
        .update(updateData)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
    },
  });
};
