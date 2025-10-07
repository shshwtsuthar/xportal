import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Tables } from '@/database.types';

type InsertPayload = Partial<Tables<'programs'>>;

/**
 * Create a program record.
 */
export const useCreateProgram = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: InsertPayload): Promise<Tables<'programs'>> => {
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
        level_of_education_id: (payload.level_of_education_id ?? null) as
          | string
          | null,
        field_of_education_id: (payload.field_of_education_id ?? null) as
          | string
          | null,
        recognition_id: (payload.recognition_id ?? null) as string | null,
        nominal_hours: (payload.nominal_hours ?? 0) as number,
        vet_flag: (payload.vet_flag ?? 'Y') as string,
        anzsco_id: (payload.anzsco_id ?? null) as string | null,
        anzsic_id: (payload.anzsic_id ?? null) as string | null,
      };

      const { data, error } = await supabase
        .from('programs')
        .insert(insertData)
        .select('*')
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programs'] });
    },
  });
};
