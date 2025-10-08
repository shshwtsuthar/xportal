import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { TablesInsert, TablesUpdate } from '@/database.types';

type TemplateInsert = TablesInsert<'payment_plan_templates'>;
type TemplateUpdate = TablesUpdate<'payment_plan_templates'>;

/**
 * Upsert a payment plan template.
 */
export const useUpsertPaymentPlanTemplate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: TemplateInsert | TemplateUpdate) => {
      const supabase = createClient();

      // Get user's RTO from JWT app_metadata (required for RLS)
      const { data: userData, error: userError } =
        await supabase.auth.getUser();
      if (userError) throw new Error(userError.message);
      const rtoId = (
        userData.user?.app_metadata as Record<string, unknown> | undefined
      )?.rto_id as string | undefined;
      if (!rtoId) throw new Error('RTO not found in user metadata');

      const isUpdate = (payload as TemplateUpdate).id !== undefined;

      if (isUpdate) {
        const { data, error } = await supabase
          .from('payment_plan_templates')
          .update(payload as TemplateUpdate)
          .eq('id', (payload as TemplateUpdate).id!)
          .select('*')
          .single();
        if (error) throw new Error(error.message);
        return data;
      }

      // For inserts, ensure rto_id is set
      const insertData = {
        ...(payload as TemplateInsert),
        rto_id: rtoId,
      };

      const { data, error } = await supabase
        .from('payment_plan_templates')
        .insert(insertData)
        .select('*')
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-plan-templates'] });
    },
  });
};
