import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useGetTimetable } from './useGetTimetable';
import { createClient } from '@/lib/supabase/client';
import { Tables } from '@/database.types';
import { extractCycleYear } from '@/lib/utils/enrollment-utils';
import {
  calculateProgression,
  type EnrollmentSubject,
} from '@/lib/utils/enrollment-progression';

// Extended timetable type with nested relations
type TimetableWithPlans = Tables<'timetables'> & {
  timetable_program_plans: Array<{
    id: string;
    program_plan_id: string;
    program_plans: Tables<'program_plans'>;
  }>;
};

// Extended program plan subject type with nested relations
type ProgramPlanSubjectWithSubject = Tables<'program_plan_subjects'> & {
  subjects: Tables<'subjects'> | null;
  // program_plan_subjects includes this flag; add explicitly to avoid any-casts
  is_prerequisite?: boolean;
};

// Re-export for backward compatibility
export type { EnrollmentSubject };

/**
 * Calculate enrollment progression across cycles based on timetable and commencement date.
 *
 * Median cut-off rule:
 * - A subject is eligible to commence only if its median_date is strictly after the chosen commencement date.
 *   That is, eligibility requires new Date(subject.median_date) > commencementDate.
 * - Subjects with median_date <= commencementDate are considered missed in the current plan and will be
 *   mapped to catch-up subjects in the next plan (when available) based on sequence order.
 *
 * @param timetableId - The selected timetable identifier.
 * @param commencementDate - The proposed commencement date.
 * @returns Enrollment progression including current cycle, catch-up, prerequisites, and combined list.
 */
export const useCalculateEnrollmentProgression = (
  timetableId?: string,
  commencementDate?: Date
) => {
  const { data: timetable } = useGetTimetable(timetableId);

  // Filter program plans for this timetable
  const programPlans = useMemo(() => {
    if (!timetable || !('timetable_program_plans' in timetable)) return [];
    const timetableWithPlans = timetable as TimetableWithPlans;
    if (!timetableWithPlans.timetable_program_plans) return [];
    return timetableWithPlans.timetable_program_plans.map(
      (tpp) => tpp.program_plans
    );
  }, [timetable]);

  // Get all subjects for all program plans in the timetable using a single query
  const programPlanIds = useMemo(
    () => programPlans.map((plan) => plan.id),
    [programPlans]
  );

  const { data: subjects = [] } = useQuery({
    queryKey: ['program-plan-subjects', programPlanIds],
    queryFn: async (): Promise<ProgramPlanSubjectWithSubject[]> => {
      if (programPlanIds.length === 0) return [];

      const supabase = createClient();
      const { data, error } = await supabase
        .from('program_plan_subjects')
        .select(
          `
          *,
          subjects(*)
        `
        )
        .in('program_plan_id', programPlanIds)
        .order('start_date', { ascending: true });

      if (error) throw new Error(error.message);
      return data || [];
    },
    enabled: programPlanIds.length > 0,
  });

  const allSubjects = useMemo(() => {
    const enrollmentSubjects: EnrollmentSubject[] = subjects.map((subject) => {
      const plan = programPlans.find((p) => p.id === subject.program_plan_id);
      return {
        id: subject.id as string,
        subject_id: subject.subject_id as string,
        subject_name: subject.subjects?.name || 'Unknown Subject',
        start_date: subject.start_date as string,
        end_date: subject.end_date as string,
        median_date: subject.median_date as string,
        sequence_order: subject.sequence_order || 0,
        is_prerequisite: subject.is_prerequisite || false,
        isCatchUp: false, // Will be calculated below
        program_plan_id: subject.program_plan_id as string,
        program_plan_name: plan?.name || 'Unknown Plan',
        cycle_year: extractCycleYear(plan?.name),
      };
    });

    return enrollmentSubjects.sort((a, b) => {
      // Sort by start date first, then by sequence order
      const dateA = new Date(a.start_date);
      const dateB = new Date(b.start_date);
      if (dateA.getTime() !== dateB.getTime()) {
        return dateA.getTime() - dateB.getTime();
      }
      return a.sequence_order - b.sequence_order;
    });
  }, [subjects, programPlans]);

  const progression = useMemo(() => {
    return calculateProgression(
      allSubjects,
      programPlans,
      commencementDate,
      timetableId,
      subjects || []
    );
  }, [allSubjects, commencementDate, timetableId, programPlans, subjects]);

  return {
    timetable,
    programPlans,
    progression,
    allSubjects,
    isLoading: !timetableId,
  };
};
