import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Tables } from '@/database.types';

type CreatePayload = {
  name: string;
  program_id: string;
};

/**
 * Create a new timetable
 */
export const useCreateTimetable = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      payload: CreatePayload
    ): Promise<Tables<'timetables'>> => {
      const supabase = createClient();

      // Get user's RTO context
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getUser();
      if (sessionError) throw new Error('Failed to get user session');

      const rtoId = (
        sessionData.user?.app_metadata as Record<string, unknown> | undefined
      )?.rto_id as string | undefined;
      if (!rtoId) {
        throw new Error(
          'User RTO not found in metadata. Please contact your administrator.'
        );
      }

      const { data, error } = await supabase
        .from('timetables')
        .insert({
          name: payload.name,
          program_id: payload.program_id,
          rto_id: rtoId,
        })
        .select('*')
        .single();
      if (error) throw new Error(error.message);
      return data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timetables'] });
    },
  });
};
