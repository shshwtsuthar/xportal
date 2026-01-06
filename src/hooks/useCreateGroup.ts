import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Tables } from '@/database.types';

type CreateGroupPayload = {
  program_id: string;
  location_id: string;
  name: string;
  max_capacity: number;
};

/**
 * Create a new group.
 * Automatically includes rto_id from user session.
 */
export const useCreateGroup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      payload: CreateGroupPayload
    ): Promise<Tables<'groups'>> => {
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

      const groupData = {
        name: payload.name,
        program_id: payload.program_id,
        location_id: payload.location_id,
        max_capacity: payload.max_capacity,
        rto_id: rtoId,
      };

      const { data, error } = await supabase
        .from('groups')
        .insert(groupData)
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
