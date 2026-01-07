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
  startDate: string | undefined,
  endDate: string | undefined
) => {
  const supabase = createClient();

  return useQuery({
    queryKey: ['blackout-dates', rtoId, startDate, endDate],
    queryFn: async () => {
      if (!rtoId || !startDate || !endDate) {
        return [];
      }

      const { data, error } = await supabase
        .from('rto_blackout_dates')
        .select('date, reason')
        .eq('rto_id', rtoId)
        .gte('date', startDate)
        .lte('date', endDate);

      if (error) throw error;

      return (data || []).map((item) => ({
        blackout_date: item.date,
        reason: item.reason,
        scope: 'rto' as const,
      })) as BlackoutDate[];
    },
    enabled: !!rtoId && !!startDate && !!endDate,
  });
};
