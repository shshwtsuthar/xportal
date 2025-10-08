import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Tables } from '@/database.types';

type InsertPayload = Partial<Tables<'subjects'>>;

/**
 * Create a subject record.
 */
export const useCreateSubject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: InsertPayload): Promise<Tables<'subjects'>> => {
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
        code: payload.code as string,
        name: payload.name as string,
        rto_id: rtoId,
        nominal_hours: (payload.nominal_hours ?? null) as number | null,
        field_of_education_id: (payload.field_of_education_id ?? null) as
          | string
          | null,
        vet_flag: (payload.vet_flag ?? 'Y') as string,
      };

      const { data, error } = await supabase
        .from('subjects')
        .insert(insertData)
        .select('*')
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
    },
  });
};
