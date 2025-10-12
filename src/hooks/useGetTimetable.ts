import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Tables } from '@/database.types';

/**
 * Fetch a single timetable by ID
 */
export const useGetTimetable = (timetableId?: string) => {
  return useQuery({
    queryKey: ['timetable', timetableId ?? 'none'],
    queryFn: async (): Promise<Tables<'timetables'> | null> => {
      if (!timetableId) return null;
      const supabase = createClient();
      const { data, error } = await supabase
        .from('timetables')
        .select(
          `
          *,
          timetable_program_plans(
            id,
            program_plan_id,
            program_plans(*)
          )
        `
        )
        .eq('id', timetableId)
        .eq('is_archived', false)
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!timetableId,
  });
};
