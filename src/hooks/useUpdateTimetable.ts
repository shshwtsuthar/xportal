import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Tables } from '@/database.types';

type UpdatePayload = Partial<Tables<'timetables'>> & { id: string };

/**
 * Update a timetable
 */
export const useUpdateTimetable = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      payload: UpdatePayload
    ): Promise<Tables<'timetables'>> => {
      const supabase = createClient();
      const { id, ...updateData } = payload;
      const { data, error } = await supabase
        .from('timetables')
        .update(updateData)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw new Error(error.message);
      return data!;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['timetables'] });
      queryClient.invalidateQueries({ queryKey: ['timetable', data.id] });
    },
  });
};
