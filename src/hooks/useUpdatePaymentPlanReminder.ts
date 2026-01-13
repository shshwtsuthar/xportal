import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { Tables } from '@/database.types';

export type UpdatePaymentPlanReminderInput = {
  id: string;
  name?: string;
  offset_days?: number;
  mail_template_id?: string;
  regenerate_invoice?: boolean;
};

/**
 * useUpdatePaymentPlanReminder
 *
 * Updates an existing payment plan reminder
 */
export const useUpdatePaymentPlanReminder = () => {
  const queryClient = useQueryClient();

  return useMutation<
    Tables<'payment_plan_reminders'>,
    Error,
    UpdatePaymentPlanReminderInput
  >({
    mutationFn: async (input) => {
      const supabase = createClient();
      const { id, ...updateData } = input;

      const { data, error } = await supabase
        .from('payment_plan_reminders')
        .update(updateData)
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    onSuccess: async () => {
      toast.success('Reminder updated successfully');
      await queryClient.invalidateQueries({
        queryKey: ['payment-plan-reminders'],
      });
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update reminder');
    },
  });
};
