import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

type UpsertBlackoutDatePayload = {
  scope: 'rto' | 'program_plan';
  rto_id?: string;
  program_plan_id?: string;
  date: string;
  reason: string;
};

/**
 * Create or update a blackout date (RTO-wide or program-specific)
 */
export const useUpsertBlackoutDate = () => {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpsertBlackoutDatePayload) => {
      if (payload.scope === 'rto') {
        if (!payload.rto_id) {
          throw new Error('rto_id is required for RTO-wide blackout dates');
        }

        const { data, error } = await supabase
          .from('rto_blackout_dates')
          .upsert({
            rto_id: payload.rto_id,
            date: payload.date,
            reason: payload.reason,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        if (!payload.program_plan_id) {
          throw new Error(
            'program_plan_id is required for program-specific blackout dates'
          );
        }

        const { data, error } = await supabase
          .from('program_plan_blackout_dates')
          .upsert({
            program_plan_id: payload.program_plan_id,
            date: payload.date,
            reason: payload.reason,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      // Invalidate all blackout date queries
      queryClient.invalidateQueries({
        queryKey: ['blackout-dates'],
      });
    },
  });
};
