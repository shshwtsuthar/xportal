import { useQuery } from '@tanstack/react-query';
import { computeRecipientCount } from '@/lib/announcementRecipients';
import type { AnnouncementFilterCriteria } from '@/types/announcementFilters';
import { createClient } from '@/lib/supabase/client';

/**
 * Compute recipient count based on filter criteria.
 * Used for preview in the recipient filtering step.
 */
export const useComputeRecipientCount = (
  criteria: AnnouncementFilterCriteria | null,
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: [
      'announcement-recipient-count',
      criteria ? JSON.stringify(criteria) : 'none',
    ],
    queryFn: async (): Promise<number> => {
      if (!criteria) {
        return 0;
      }

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('User not authenticated');
      }

      const rtoId = (user.app_metadata as Record<string, unknown> | undefined)
        ?.rto_id as string | undefined;
      if (!rtoId) {
        throw new Error('RTO ID not found in user metadata');
      }

      return await computeRecipientCount(criteria, rtoId);
    },
    enabled: enabled && criteria !== null,
  });
};
