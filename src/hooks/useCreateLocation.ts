import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Tables } from '@/database.types';

type InsertPayload = Partial<Tables<'delivery_locations'>>;

/**
 * Create a location record.
 */
export const useCreateLocation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      payload: InsertPayload
    ): Promise<Tables<'delivery_locations'>> => {
      const supabase = createClient();

      // Get user's RTO from JWT app_metadata (required for RLS)
      const { data: userData, error: userError } =
        await supabase.auth.getUser();
      if (userError) throw new Error(userError.message);
      const rtoId = (
        userData.user?.app_metadata as Record<string, unknown> | undefined
      )?.rto_id as string | undefined;
      if (!rtoId) throw new Error('RTO not found in user metadata');

      // Enforce required keys per generated types: cast only after filling required fields
      const insertData = {
        location_id_internal: payload.location_id_internal as string,
        name: payload.name as string,
        rto_id: rtoId,
        building_property_name: (payload.building_property_name ?? null) as
          | string
          | null,
        flat_unit_details: (payload.flat_unit_details ?? null) as string | null,
        street_number: (payload.street_number ?? null) as string | null,
        street_name: (payload.street_name ?? null) as string | null,
        suburb: (payload.suburb ?? null) as string | null,
        state: (payload.state ?? null) as string | null,
        postcode: (payload.postcode ?? null) as string | null,
      };

      const { data, error } = await supabase
        .from('delivery_locations')
        .insert(insertData)
        .select('*')
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
    },
  });
};
