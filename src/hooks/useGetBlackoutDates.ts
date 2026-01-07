import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

type BlackoutDate = {
  blackout_date: string;
  reason: string;
  scope: 'rto' | 'program_plan';
};

/**
 * Fetch blackout dates for a date range
 * Includes both RTO-wide and program-specific blackout dates
 */
export const useGetBlackoutDates = (
  rtoId: string | undefined,
  programPlanId: string | undefined,
  startDate: string | undefined,
  endDate: string | undefined
) => {
  const supabase = createClient();

  return useQuery({
    queryKey: ['blackout-dates', rtoId, programPlanId, startDate, endDate],
    queryFn: async () => {
      if (!rtoId || !programPlanId || !startDate || !endDate) {
        return [];
      }

      const { data, error } = await supabase.rpc('get_blackout_dates', {
        p_rto_id: rtoId,
        p_program_plan_id: programPlanId,
        p_start_date: startDate,
        p_end_date: endDate,
      });

      if (error) throw error;
      return (data || []) as BlackoutDate[];
    },
    enabled: !!rtoId && !!programPlanId && !!startDate && !!endDate,
  });
};
