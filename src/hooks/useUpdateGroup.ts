import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Tables } from '@/database.types';

type UpdateGroupPayload = {
  id: string;
  name?: string;
  location_id?: string;
  max_capacity?: number;
};

/**
 * Update an existing group.
 */
export const useUpdateGroup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      payload: UpdateGroupPayload
    ): Promise<Tables<'groups'>> => {
      const supabase = createClient();
      const { id, ...updates } = payload;

      const { data, error } = await supabase
        .from('groups')
        .update(updates)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw new Error(error.message);
      return data!;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({
        queryKey: ['groups', 'byProgram', data.program_id as string],
      });
    },
  });
};
