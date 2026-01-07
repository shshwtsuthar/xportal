import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

type UpsertBlackoutDatePayload = {
  rto_id: string;
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
    },
    onSuccess: () => {
      // Invalidate all blackout date queries
      queryClient.invalidateQueries({
        queryKey: ['blackout-dates'],
      });
    },
  });
};
