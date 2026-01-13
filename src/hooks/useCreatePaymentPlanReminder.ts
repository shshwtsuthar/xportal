import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { Tables } from '@/database.types';

export type CreatePaymentPlanReminderInput = {
  template_id: string;
  name: string;
  offset_days: number;
  mail_template_id: string;
  regenerate_invoice: boolean;
};

/**
 * useCreatePaymentPlanReminder
 *
 * Creates a new payment plan reminder
 */
export const useCreatePaymentPlanReminder = () => {
  const queryClient = useQueryClient();

  return useMutation<
    Tables<'payment_plan_reminders'>,
    Error,
    CreatePaymentPlanReminderInput
  >({
    mutationFn: async (input) => {
      const supabase = createClient();

      // Get current user's RTO
      const { data: userData, error: userError } =
        await supabase.auth.getUser();
      if (userError) {
        throw new Error(
          'Unable to resolve current user. Please re-authenticate.'
        );
      }

      const rtoId = (
        userData.user?.app_metadata as Record<string, unknown> | undefined
      )?.rto_id as string | undefined;
      if (!rtoId) {
        throw new Error('User RTO not found in metadata.');
      }

      const { data, error } = await supabase
        .from('payment_plan_reminders')
        .insert({
          template_id: input.template_id,
          rto_id: rtoId,
          name: input.name,
          offset_days: input.offset_days,
          mail_template_id: input.mail_template_id,
          regenerate_invoice: input.regenerate_invoice,
        })
        .select('*')
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    onSuccess: async () => {
      toast.success('Reminder created successfully');
      await queryClient.invalidateQueries({
        queryKey: ['payment-plan-reminders'],
      });
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create reminder');
    },
  });
};
