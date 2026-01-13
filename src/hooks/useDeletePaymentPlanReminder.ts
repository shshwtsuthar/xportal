import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

/**
 * useDeletePaymentPlanReminder
 *
 * Deletes a payment plan reminder
 */
export const useDeletePaymentPlanReminder = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (reminderId: string) => {
      const supabase = createClient();

      const { error } = await supabase
        .from('payment_plan_reminders')
        .delete()
        .eq('id', reminderId);

      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: async () => {
      toast.success('Reminder deleted successfully');
      await queryClient.invalidateQueries({
        queryKey: ['payment-plan-reminders'],
      });
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete reminder');
    },
  });
};
