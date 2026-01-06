import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Tables, TablesInsert } from '@/database.types';

type UpsertPayload = Partial<Tables<'program_plan_classes'>> & { id?: string };

/**
 * Upsert Program Plan Class (insert or update one class session)
 */
export const useUpsertProgramPlanClass = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      payload: UpsertPayload
    ): Promise<Tables<'program_plan_classes'>> => {
      const supabase = createClient();
      if (payload.id) {
        const { data, error } = await supabase
          .from('program_plan_classes')
          .update(payload)
          .eq('id', payload.id)
          .select('*')
          .single();
        if (error) throw new Error(error.message);
        return data!;
      }
      // Ensure required fields are present for insert
      // location_id and group_id are now mandatory (NOT NULL)
      if (!payload.location_id) {
        throw new Error('location_id is required when creating a class');
      }

      if (!payload.group_id) {
        throw new Error('group_id is required when creating a class');
      }

      if (!payload.program_plan_subject_id || !payload.class_date) {
        throw new Error(
          'program_plan_subject_id and class_date are required when creating a class'
        );
      }

      const insertData: TablesInsert<'program_plan_classes'> = {
        program_plan_subject_id: payload.program_plan_subject_id,
        class_date: payload.class_date,
        start_time: payload.start_time ?? null,
        end_time: payload.end_time ?? null,
        trainer_id: payload.trainer_id ?? null,
        location_id: payload.location_id, // Required - validated above
        classroom_id: payload.classroom_id ?? null,
        group_id: payload.group_id, // Required - validated above
        class_type: payload.class_type ?? null,
        notes: payload.notes ?? null,
      };

      const { data, error } = await supabase
        .from('program_plan_classes')
        .insert(insertData)
        .select('*')
        .single();
      if (error) throw new Error(error.message);
      return data!;
    },
    onSuccess: (row) => {
      queryClient.invalidateQueries({
        queryKey: ['programPlanClasses', row.program_plan_subject_id as string],
      });
    },
  });
};
