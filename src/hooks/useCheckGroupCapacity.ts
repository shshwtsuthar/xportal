import { useMutation } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

interface CapacityCheckResult {
  hasCapacity: boolean;
  groupId: string;
  groupName?: string;
  currentCount?: number;
  maxCapacity?: number;
  alternatives?: Array<{
    id: string;
    name: string;
    current_enrollment_count: number;
    max_capacity: number;
    availableSpots: number;
  }>;
}

type Payload = { applicationId: string };

/**
 * Checks if the group assigned to an application has capacity.
 * If full, returns alternative groups with available capacity.
 * Used before approving an application to handle race conditions.
 */
export const useCheckGroupCapacity = () => {
  return useMutation({
    mutationFn: async ({ applicationId }: Payload) => {
      const supabase = createClient();
      const { data, error } = await supabase.functions.invoke(
        'check-group-capacity',
        { body: { applicationId } }
      );
      if (error) throw new Error(error.message);
      return data as CapacityCheckResult;
    },
  });
};
