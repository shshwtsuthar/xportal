import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Tables } from '@/database.types';

type UpdatePayload = {
  id: string;
} & Partial<Tables<'agents'>>;

/**
 * Update an agent record.
 */
export const useUpdateAgent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UpdatePayload): Promise<Tables<'agents'>> => {
      const supabase = createClient();
      const { id, ...updateData } = payload;

      const { data, error } = await supabase
        .from('agents')
        .update(updateData)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    },
  });
};
