import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

type EmailStats = {
  totalSent: number;
  sentLast7d: number;
  deliveredLast7d: number;
  failedLast7d: number;
};

/**
 * useGetEmailStats
 *
 * Returns counts for the four Mail page KPI cards:
 * - totalSent: number of messages with non-null sent_at
 * - sentLast7d: messages sent in the last 7 days
 * - deliveredLast7d: delivered in last 7 days
 * - failedLast7d: failed/bounced in last 7 days
 *
 * @returns TanStack Query result with EmailStats
 */
export const useGetEmailStats = () => {
  return useQuery<EmailStats>({
    queryKey: ['emails', 'stats'],
    queryFn: async () => {
      const supabase = createClient();
      const now = new Date();
      const sevenDaysAgo = new Date(
        now.getTime() - 7 * 24 * 60 * 60 * 1000
      ).toISOString();

      // totalSent
      const { count: totalSent, error: totalErr } = await supabase
        .from('email_messages')
        .select('id', { count: 'exact', head: true })
        .not('sent_at', 'is', null);
      if (totalErr) throw new Error(totalErr.message);

      // sent last 7 days
      const { count: sentLast7d, error: sentErr } = await supabase
        .from('email_messages')
        .select('id', { count: 'exact', head: true })
        .gte('sent_at', sevenDaysAgo);
      if (sentErr) throw new Error(sentErr.message);

      // delivered last 7 days
      const { count: deliveredLast7d, error: delErr } = await supabase
        .from('email_messages')
        .select('id', { count: 'exact', head: true })
        .gte('delivered_at', sevenDaysAgo);
      if (delErr) throw new Error(delErr.message);

      // failed last 7 days (FAILED or BOUNCED)
      const { count: failedLast7d, error: failErr } = await supabase
        .from('email_messages')
        .select('id', { count: 'exact', head: true })
        .in('status', ['FAILED', 'BOUNCED'])
        .gte('status_updated_at', sevenDaysAgo);
      if (failErr) throw new Error(failErr.message);

      return {
        totalSent: totalSent ?? 0,
        sentLast7d: sentLast7d ?? 0,
        deliveredLast7d: deliveredLast7d ?? 0,
        failedLast7d: failedLast7d ?? 0,
      };
    },
  });
};
