import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { TablesInsert, TablesUpdate } from '@/database.types';

type InstallmentLineInsert =
  TablesInsert<'payment_plan_template_installment_lines'>;
type InstallmentLineUpdate =
  TablesUpdate<'payment_plan_template_installment_lines'>;

/**
 * Upsert a batch of template installment lines.
 * Handles inserts, updates, and deletes (by comparing with existing lines).
 */
export const useUpsertTemplateInstallmentLines = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      installmentId: string;
      lines: (InstallmentLineInsert | InstallmentLineUpdate)[];
    }) => {
      const supabase = createClient();

      // Fetch existing lines for this installment
      const { data: existingLines, error: fetchError } = await supabase
        .from('payment_plan_template_installment_lines')
        .select('id')
        .eq('installment_id', payload.installmentId);

      if (fetchError) throw new Error(fetchError.message);

      const existingIds = new Set((existingLines ?? []).map((l) => l.id));
      const payloadIds = new Set(
        payload.lines
          .map((l) => (l as InstallmentLineUpdate).id)
          .filter((id): id is string => !!id)
      );

      // Delete lines that were removed
      const idsToDelete = Array.from(existingIds).filter(
        (id) => !payloadIds.has(id)
      );
      if (idsToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('payment_plan_template_installment_lines')
          .delete()
          .in('id', idsToDelete);
        if (deleteError) throw new Error(deleteError.message);
      }

      // Separate inserts and updates
      const inserts = payload.lines.filter(
        (p) => !(p as InstallmentLineUpdate).id
      ) as InstallmentLineInsert[];
      const updates = payload.lines.filter(
        (p) => (p as InstallmentLineUpdate).id
      ) as InstallmentLineUpdate[];

      // Insert new lines
      if (inserts.length > 0) {
        const insertsWithInstallmentId = inserts.map((line) => ({
          ...line,
          installment_id: payload.installmentId,
        }));
        const { error } = await supabase
          .from('payment_plan_template_installment_lines')
          .insert(insertsWithInstallmentId);
        if (error) throw new Error(error.message);
      }

      // Update existing lines
      for (const u of updates) {
        const { error } = await supabase
          .from('payment_plan_template_installment_lines')
          .update(u)
          .eq('id', u.id!);
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['payment-plan-installment-lines', variables.installmentId],
      });
      queryClient.invalidateQueries({
        queryKey: ['payment-plan-installments'],
      });
    },
  });
};
