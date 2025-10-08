import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { TablesInsert, TablesUpdate } from '@/database.types';

type InstallmentInsert = TablesInsert<'payment_plan_template_installments'>;
type InstallmentUpdate = TablesUpdate<'payment_plan_template_installments'>;

/**
 * Upsert a batch of template installments.
 */
export const useUpsertTemplateInstallments = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: (InstallmentInsert | InstallmentUpdate)[]) => {
      const supabase = createClient();

      const inserts = payload.filter((p) => !(p as InstallmentUpdate).id);
      const updates = payload.filter((p) => (p as InstallmentUpdate).id);

      if (inserts.length) {
        const { error } = await supabase
          .from('payment_plan_template_installments')
          .insert(inserts as InstallmentInsert[]);
        if (error) throw new Error(error.message);
      }

      for (const u of updates as InstallmentUpdate[]) {
        const { error } = await supabase
          .from('payment_plan_template_installments')
          .update(u)
          .eq('id', u.id!);
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['payment-plan-installments'],
      });
    },
  });
};
