import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Tables } from '@/database.types';

export type PaymentPlanReminderWithRelations =
  Tables<'payment_plan_reminders'> & {
    payment_plan_templates: {
      id: string;
      name: string;
    } | null;
    mail_templates: {
      id: string;
      name: string;
      subject: string;
    } | null;
  };

/**
 * useGetPaymentPlanReminders
 *
 * Fetches all payment plan reminders for the current RTO with related template names
 */
export const useGetPaymentPlanReminders = () => {
  return useQuery<PaymentPlanReminderWithRelations[]>({
    queryKey: ['payment-plan-reminders'],
    queryFn: async () => {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('payment_plan_reminders')
        .select(
          `
          *,
          payment_plan_templates:template_id (
            id,
            name
          ),
          mail_templates:mail_template_id (
            id,
            name,
            subject
          )
        `
        )
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      return data as PaymentPlanReminderWithRelations[];
    },
  });
};
