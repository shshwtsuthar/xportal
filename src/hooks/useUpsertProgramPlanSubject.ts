import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Tables } from '@/database.types';

type UpsertPayload = Partial<Tables<'program_plan_subjects'>> & {
  id?: string;
  funding_source_national?: string | null;
};

/**
 * Upsert Program Plan Subject (insert or update one row)
 */
export const useUpsertProgramPlanSubject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      payload: UpsertPayload
    ): Promise<Tables<'program_plan_subjects'>> => {
      const supabase = createClient();
      if (payload.id) {
        const { id: _id, ...updatePayload } = payload;
        const { data, error } = await supabase
          .from('program_plan_subjects')
          .update(updatePayload)
          .eq('id', payload.id)
          .select('*')
          .single();
        if (error) throw new Error(error.message);
        return data!;
      }
      const subjectData = {
        program_plan_id: payload.program_plan_id!,
        subject_id: payload.subject_id!,
        start_date: payload.start_date!,
        end_date: payload.end_date!,
        median_date: payload.median_date!,
        sequence_order: payload.sequence_order,
        is_prerequisite: payload.is_prerequisite ?? false,
        ...(payload.funding_source_national !== undefined && {
          funding_source_national: payload.funding_source_national,
        }),
      };

      const { data, error } = await supabase
        .from('program_plan_subjects')
        .insert(subjectData)
        .select('*')
        .single();
      if (error) throw new Error(error.message);
      return data!;
    },
    onSuccess: (row) => {
      queryClient.invalidateQueries({
        queryKey: ['programPlanSubjects', row.program_plan_id as string],
      });
    },
  });
};
