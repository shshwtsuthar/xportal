import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Tables } from '@/database.types';

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
      const insertData = {
        program_plan_subject_id: payload.program_plan_subject_id!,
        class_date: payload.class_date!,
        start_time: payload.start_time,
        end_time: payload.end_time,
        trainer_id: payload.trainer_id,
        location_id: payload.location_id,
        classroom_id: payload.classroom_id,
        class_type: payload.class_type,
        notes: payload.notes,
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
