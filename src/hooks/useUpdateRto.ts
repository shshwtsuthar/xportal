import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Tables } from '@/database.types';

type UpdatePayload = Partial<Tables<'rtos'>>;

/**
 * Update RTO information.
 */
export const useUpdateRto = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UpdatePayload): Promise<Tables<'rtos'>> => {
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
        name: payload.name as string,
        rto_code: payload.rto_code as string,
        address_line_1: payload.address_line_1 || null,
        suburb: payload.suburb || null,
        state: payload.state || null,
        postcode: payload.postcode || null,
        type_identifier: payload.type_identifier || null,
        phone_number: payload.phone_number || null,
        facsimile_number: payload.facsimile_number || null,
        email_address: payload.email_address || null,
        contact_name: payload.contact_name || null,
        statistical_area_1_id: payload.statistical_area_1_id || null,
        statistical_area_2_id: payload.statistical_area_2_id || null,
      };

      const { data, error } = await supabase
        .from('rtos')
        .update(updateData)
        .eq('id', rtoId)
        .select('*')
        .single();

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rto'] });
    },
  });
};
