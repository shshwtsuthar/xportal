import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Tables } from '@/database.types';

type UpsertPayload = Partial<Tables<'program_plans'>> & { id?: string };

/**
 * Upsert Program Plan (insert if no id, else update).
 * Automatically includes rto_id from user session for new plans.
 */
export const useUpsertProgramPlan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      payload: UpsertPayload
    ): Promise<Tables<'program_plans'>> => {
      const supabase = createClient();

      if (payload.id) {
        // Update existing plan
        const { data, error } = await supabase
          .from('program_plans')
          .update(payload)
          .eq('id', payload.id)
          .select('*')
          .single();
        if (error) throw new Error(error.message);
        return data!;
      }

      // Create new plan - get user's RTO context
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

      const planData = {
        name: payload.name!,
        program_id: payload.program_id!,
        rto_id: rtoId,
      };

      const { data, error } = await supabase
        .from('program_plans')
        .insert(planData)
        .select('*')
        .single();
      if (error) throw new Error(error.message);
      return data!;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['programPlans'] });
      queryClient.invalidateQueries({
        queryKey: ['programPlans', data.program_id as string],
      });
    },
  });
};
