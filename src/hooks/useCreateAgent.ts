import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Tables } from '@/database.types';

type InsertPayload = Partial<Tables<'agents'>>;

/**
 * Create an agent record.
 */
export const useCreateAgent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: InsertPayload): Promise<Tables<'agents'>> => {
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
        name: payload.name as string,
        rto_id: rtoId,
        contact_person: (payload.contact_person ?? null) as string | null,
        contact_email: (payload.contact_email ?? null) as string | null,
        contact_phone: (payload.contact_phone ?? null) as string | null,
        slug: payload.slug as string,
      };

      const { data, error } = await supabase
        .from('agents')
        .insert(insertData)
        .select('*')
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    },
  });
};
