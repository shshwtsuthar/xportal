import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Tables } from '@/database.types';

type UpdatePayload = Partial<Tables<'programs'>> & { id: string };

/**
 * Update a program by id.
 */
export const useUpdateProgram = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UpdatePayload): Promise<void> => {
      const supabase = createClient();
      const { error } = await supabase
        .from('programs')
        .update(payload)
        .eq('id', payload.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['programs'] });
      queryClient.invalidateQueries({ queryKey: ['program', variables.id] });
    },
  });
};
