import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useGetTimetable } from './useGetTimetable';
import { useGetProgramPlans } from './useGetProgramPlans';
import { createClient } from '@/lib/supabase/client';
import { Tables } from '@/database.types';

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
};

export type EnrollmentSubject = {
  id: string;
  subject_id: string;
  subject_name: string;
  start_date: string;
  end_date: string;
  median_date: string;
  sequence_order: number;
  is_prerequisite: boolean;
  isCatchUp: boolean;
  program_plan_id: string;
  program_plan_name: string;
  cycle_year: string;
};

/**
 * Calculate enrollment progression across cycles based on timetable and commencement date
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
        cycle_year: plan?.name?.includes('2025')
          ? '2025'
          : plan?.name?.includes('2026')
            ? '2026'
            : plan?.name?.includes('2027')
              ? '2027'
              : 'Current',
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
    if (!commencementDate || !timetableId || programPlans.length === 0) {
      return {
        currentCycleSubjects: [],
        catchUpSubjects: [],
        prerequisites: [],
        allSubjects: [],
      };
    }

    // Step 1: Sort program plans by their start dates (chronologically)
    const sortedPlans = [...programPlans].sort((a, b) => {
      const aFirstSubject = allSubjects.find((s) => s.program_plan_id === a.id);
      const bFirstSubject = allSubjects.find((s) => s.program_plan_id === b.id);
      if (!aFirstSubject || !bFirstSubject) return 0;
      return (
        new Date(aFirstSubject.start_date).getTime() -
        new Date(bFirstSubject.start_date).getTime()
      );
    });

    // Step 2: Find which program plan the student's commencement falls into
    let currentPlanIndex = 0;
    for (let i = 0; i < sortedPlans.length; i++) {
      const planSubjects = allSubjects.filter(
        (s) => s.program_plan_id === sortedPlans[i].id
      );
      if (planSubjects.length === 0) continue;

      const planStart = new Date(planSubjects[0].start_date);
      const planEnd = new Date(planSubjects[planSubjects.length - 1].end_date);

      if (commencementDate >= planStart && commencementDate <= planEnd) {
        currentPlanIndex = i;
        break;
      }
      // If commencement is before this plan starts, use this plan
      if (commencementDate < planStart) {
        currentPlanIndex = i;
        break;
      }
    }

    const currentPlan = sortedPlans[currentPlanIndex];
    const currentPlanSubjects = allSubjects.filter(
      (s) => s.program_plan_id === currentPlan.id
    );

    // Step 3: Current cycle - subjects from current plan that start on/after commencement
    const currentCycleSubjects = currentPlanSubjects.filter(
      (s) => new Date(s.start_date) >= commencementDate
    );

    // Step 4: Catch-up subjects - from NEXT program plan (if it exists)
    let catchUpSubjects: EnrollmentSubject[] = [];
    const nextPlanIndex = currentPlanIndex + 1;

    if (nextPlanIndex < sortedPlans.length) {
      // There is a next program plan available for catch-up
      const nextPlan = sortedPlans[nextPlanIndex];
      const nextPlanSubjects = allSubjects.filter(
        (s) => s.program_plan_id === nextPlan.id
      );

      // Find which subjects were missed in the current plan (started before commencement)
      const missedSubjectsInCurrentPlan = currentPlanSubjects.filter(
        (s) => new Date(s.start_date) < commencementDate
      );

      // Get corresponding subjects from next plan based on sequence order
      const missedSequenceOrders = missedSubjectsInCurrentPlan.map(
        (s) => s.sequence_order
      );
      catchUpSubjects = nextPlanSubjects
        .filter((s) => missedSequenceOrders.includes(s.sequence_order))
        .map((s) => ({ ...s, isCatchUp: true }));
    }
    // If no next plan exists, catchUpSubjects remains empty (no catch-up available)

    // Step 5: Prerequisites from the FIRST program plan only (to avoid duplication)
    const firstPlanSubjects = allSubjects.filter(
      (s) => s.program_plan_id === sortedPlans[0].id
    );
    const prerequisites = firstPlanSubjects.filter((s) => s.is_prerequisite);

    return {
      currentCycleSubjects,
      catchUpSubjects,
      prerequisites,
      allSubjects: [...currentCycleSubjects, ...catchUpSubjects],
    };
  }, [allSubjects, commencementDate, timetableId, programPlans]);

  return {
    timetable,
    programPlans,
    progression,
    isLoading: !timetableId,
  };
};
