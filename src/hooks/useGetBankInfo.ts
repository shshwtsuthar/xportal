import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Tables } from '@/database.types';

/**
 * Fetch bank information for the current RTO.
 */
export const useGetBankInfo = () => {
  return useQuery({
    queryKey: ['bank-info'],
    queryFn: async (): Promise<{
      bank_name: string | null;
      bank_account_name: string | null;
      bank_bsb: string | null;
      bank_account_number: string | null;
    }> => {
      const supabase = createClient();

      // Get user's RTO from JWT app_metadata
      const { data: userData, error: userError } =
        await supabase.auth.getUser();
      if (userError) throw new Error(userError.message);
      const rtoId = (
        userData.user?.app_metadata as Record<string, unknown> | undefined
      )?.rto_id as string | undefined;
      if (!rtoId) throw new Error('RTO not found in user metadata');

      const { data, error } = await supabase
        .from('rtos')
        .select('bank_name, bank_account_name, bank_bsb, bank_account_number')
        .eq('id', rtoId)
        .single();

      if (error) throw new Error(error.message);
      return {
        bank_name: data?.bank_name ?? null,
        bank_account_name: data?.bank_account_name ?? null,
        bank_bsb: data?.bank_bsb ?? null,
        bank_account_number: data?.bank_account_number ?? null,
      };
    },
  });
};
