import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { queryKeys } from '@/src/lib/queryKeys';

type PersistLearningPlanPayload = {
  applicationId: string;
  timetableId?: string | null;
  proposedCommencementDate?: string | null;
};

/**
 * Hook to persist draft learning plan for an application.
 * Only persists if both timetable_id and proposed_commencement_date exist.
 */
export const usePersistLearningPlan = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      applicationId,
      timetableId,
      proposedCommencementDate,
    }: PersistLearningPlanPayload): Promise<void> => {
      // Persist draft learning plan only if both drivers exist
      if (!timetableId || !proposedCommencementDate) {
        return; // Skip silently - it's okay for these to be empty during draft
      }

      const supabase = createClient();
      const { error } = await supabase.rpc(
        'upsert_application_learning_plan_draft',
        { app_id: applicationId }
      );

      if (error) {
        console.error('Draft plan RPC error:', error.message);
        throw new Error(`Failed to persist learning plan: ${error.message}`);
      }
    },
    onSuccess: (_, variables) => {
      // Invalidate learning plan query to show fresh data
      queryClient.invalidateQueries({
        queryKey: queryKeys.applicationLearningPlan(variables.applicationId),
      });
    },
    onError: (error) => {
      console.error('Draft learning plan error:', error);
      toast.error('Saved draft, but failed to persist learning plan');
    },
  });
};
