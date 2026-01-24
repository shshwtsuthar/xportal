import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { queryKeys } from '@/src/lib/queryKeys';

type PersistPaymentSchedulePayload = {
  applicationId: string;
  paymentPlanTemplateId?: string | null;
  paymentAnchorDate?: string | null;
};

/**
 * Hook to persist draft payment schedule for an application.
 * Only persists if both template_id and anchor_date exist.
 */
export const usePersistPaymentSchedule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      applicationId,
      paymentPlanTemplateId,
      paymentAnchorDate,
    }: PersistPaymentSchedulePayload): Promise<void> => {
      // Persist draft payment schedule only when template AND anchor date exist
      if (!paymentPlanTemplateId || !paymentAnchorDate) {
        // Soft guidance: no RPC call without anchor date
        // Keep silent success for draft save; preview will prompt for date
        return;
      }

      const supabase = createClient();
      const { error } = await supabase.rpc(
        'upsert_application_payment_schedule_draft',
        { app_id: applicationId }
      );

      if (error) {
        console.error('Draft payment schedule RPC error:', error.message);
        throw new Error(`Failed to persist payment schedule: ${error.message}`);
      }
    },
    onSuccess: (_, variables) => {
      // Invalidate payment schedule queries to show fresh data
      queryClient.invalidateQueries({
        queryKey: queryKeys.applicationPaymentSchedule(variables.applicationId),
      });
    },
    onError: (error) => {
      console.error('Draft payment schedule error:', error);
      toast.error('Saved draft, but failed to persist payment schedule');
    },
  });
};
