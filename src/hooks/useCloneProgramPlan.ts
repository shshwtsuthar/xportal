import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Tables } from '@/database.types';

type ClonePayload = {
  sourceProgramPlanId: string;
  newName: string;
  timetableId: string;
};

/**
 * Clone an existing program plan into a timetable
 */
export const useCloneProgramPlan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      payload: ClonePayload
    ): Promise<Tables<'program_plans'>> => {
      const supabase = createClient();

      // First, get the source program plan
      const { data: sourcePlan, error: sourceError } = await supabase
        .from('program_plans')
        .select('*')
        .eq('id', payload.sourceProgramPlanId)
        .single();

      if (sourceError) throw new Error(sourceError.message);

      // Create the new program plan
      const { data: newPlan, error: planError } = await supabase
        .from('program_plans')
        .insert({
          name: payload.newName,
          program_id: sourcePlan.program_id,
          timetable_id: payload.timetableId,
          rto_id: sourcePlan.rto_id,
        })
        .select('*')
        .single();

      if (planError) throw new Error(planError.message);

      // Get all subjects from the source plan
      const { data: sourceSubjects, error: subjectsError } = await supabase
        .from('program_plan_subjects')
        .select('*')
        .eq('program_plan_id', payload.sourceProgramPlanId);

      if (subjectsError) throw new Error(subjectsError.message);

      // Clone all subjects
      if (sourceSubjects && sourceSubjects.length > 0) {
        const subjectsToInsert = sourceSubjects.map((subject) => ({
          program_plan_id: newPlan.id,
          subject_id: subject.subject_id,
          start_date: subject.start_date,
          end_date: subject.end_date,
          median_date: subject.median_date,
          sequence_order: subject.sequence_order,
          is_prerequisite: subject.is_prerequisite,
        }));

        const { error: insertError } = await supabase
          .from('program_plan_subjects')
          .insert(subjectsToInsert);

        if (insertError) throw new Error(insertError.message);
      }

      return newPlan!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programPlans'] });
      queryClient.invalidateQueries({ queryKey: ['timetables'] });
    },
  });
};
