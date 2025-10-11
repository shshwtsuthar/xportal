import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Tables, Enums } from '@/database.types';

type InsertPayload = Partial<Tables<'classrooms'>>;

/**
 * Create a classroom record.
 */
export const useCreateClassroom = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      payload: InsertPayload
    ): Promise<Tables<'classrooms'>> => {
      const supabase = createClient();

      // Get user's RTO from JWT app_metadata (required for RLS)
      const { data: userData, error: userError } =
        await supabase.auth.getUser();
      if (userError) throw new Error(userError.message);
      const rtoId = (
        userData.user?.app_metadata as Record<string, unknown> | undefined
      )?.rto_id as string | undefined;
      if (!rtoId) throw new Error('RTO not found in user metadata');

      // Enforce required keys per generated types: cast only after filling required fields
      const insertData = {
        name: payload.name as string,
        type: payload.type as Enums<'classroom_type'>,
        capacity: payload.capacity as number,
        status: payload.status as Enums<'classroom_status'>,
        rto_id: rtoId,
        location_id: payload.location_id as string,
        description: (payload.description ?? null) as string | null,
      };

      const { data, error } = await supabase
        .from('classrooms')
        .insert(insertData)
        .select('*')
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['classrooms', data.location_id],
      });
    },
  });
};
