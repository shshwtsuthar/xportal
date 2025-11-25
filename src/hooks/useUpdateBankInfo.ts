import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

type BankInfoPayload = {
  bank_name?: string | null;
  bank_account_name?: string | null;
  bank_bsb?: string | null;
  bank_account_number?: string | null;
};

/**
 * Update bank information for the current RTO.
 */
export const useUpdateBankInfo = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: BankInfoPayload): Promise<void> => {
      const supabase = createClient();

      // Get user's RTO from JWT app_metadata
      const { data: userData, error: userError } =
        await supabase.auth.getUser();
      if (userError) throw new Error(userError.message);
      const rtoId = (
        userData.user?.app_metadata as Record<string, unknown> | undefined
      )?.rto_id as string | undefined;
      if (!rtoId) throw new Error('RTO not found in user metadata');

      // Clean up empty strings to null for optional fields
      const updateData = {
        bank_name: payload.bank_name || null,
        bank_account_name: payload.bank_account_name || null,
        bank_bsb: payload.bank_bsb || null,
        bank_account_number: payload.bank_account_number || null,
      };

      const { error } = await supabase
        .from('rtos')
        .update(updateData)
        .eq('id', rtoId);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-info'] });
      queryClient.invalidateQueries({ queryKey: ['rto'] });
    },
  });
};
