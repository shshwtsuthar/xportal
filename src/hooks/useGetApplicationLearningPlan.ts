import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Tables } from '@/database.types';

type ALS = Tables<'application_learning_subjects'>;
type ALC = Tables<'application_learning_classes'>;

export type ApplicationLearningPlanRow = ALS & {
  classes: ALC[];
  subjects: Tables<'subjects'> | null;
};

/**
 * Fetch frozen application learning plan (subjects + classes) for an application.
 * @param applicationId - Application identifier
 * @returns Rows grouped by subject, with nested classes
 */
export const useGetApplicationLearningPlan = (applicationId?: string) => {
  return useQuery({
    queryKey: ['application-learning-plan', applicationId ?? 'none'],
    queryFn: async (): Promise<ApplicationLearningPlanRow[]> => {
      if (!applicationId) return [];
      const supabase = createClient();

      // Fetch all ALS rows
      const { data: als, error: alsErr } = await supabase
        .from('application_learning_subjects')
        .select(`*, subjects(*)`)
        .eq('application_id', applicationId)
        .order('planned_start_date', { ascending: true });
      if (alsErr) throw new Error(alsErr.message);

      if (!als || als.length === 0) return [];

      const alsIds = als.map((r) => r.id);
      const { data: alc, error: alcErr } = await supabase
        .from('application_learning_classes')
        .select('*')
        .in('application_learning_subject_id', alsIds)
        .order('class_date', { ascending: true });
      if (alcErr) throw new Error(alcErr.message);

      const byAlsId = new Map<string, ALC[]>();
      for (const c of alc ?? []) {
        const arr = byAlsId.get(c.application_learning_subject_id) ?? [];
        arr.push(c);
        byAlsId.set(c.application_learning_subject_id, arr);
      }

      return (als ?? []).map((s) => ({
        ...(s as ALS),
        classes: byAlsId.get(s.id) ?? [],
        subjects:
          (s as unknown as { subjects: Tables<'subjects'> | null }).subjects ??
          null,
      }));
    },
  });
};
