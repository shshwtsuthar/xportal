import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

/**
 * Soft delete a timetable (set is_archived=true)
 */
export const useDeleteTimetable = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (timetableId: string): Promise<void> => {
      const supabase = createClient();
      const { error } = await supabase
        .from('timetables')
        .update({ is_archived: true })
        .eq('id', timetableId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timetables'] });
    },
  });
};
