/**
 * Enrollment progression calculation utilities
 * Handles the complex logic of determining which subjects a student should enroll in
 * based on their commencement date and the median cut-off rule.
 */

import { Tables } from '@/database.types';

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

export type ProgramPlan = Tables<'program_plans'>;

/**
 * Sort program plans chronologically by their first subject's start date
 */
export const sortProgramPlansByStartDate = (
  programPlans: ProgramPlan[],
  allSubjects: EnrollmentSubject[]
): ProgramPlan[] => {
  return [...programPlans].sort((a, b) => {
    const aFirstSubject = allSubjects.find((s) => s.program_plan_id === a.id);
    const bFirstSubject = allSubjects.find((s) => s.program_plan_id === b.id);
    if (!aFirstSubject || !bFirstSubject) return 0;
    return (
      new Date(aFirstSubject.start_date).getTime() -
      new Date(bFirstSubject.start_date).getTime()
    );
  });
};

/**
 * Find which program plan the student's commencement date falls into
 */
export const findCurrentPlanIndex = (
  sortedPlans: ProgramPlan[],
  allSubjects: EnrollmentSubject[],
  commencementDate: Date
): number => {
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

  return currentPlanIndex;
};

/**
 * Find the first eligible subject based on the median cut-off rule
 * A subject is eligible if its median_date > commencementDate
 */
export const findFirstEligibleSubject = (
  subjects: EnrollmentSubject[],
  commencementDate: Date
): number => {
  return subjects.findIndex((s) => new Date(s.median_date) > commencementDate);
};

/**
 * Get subjects from the current cycle that the student is eligible for
 */
export const getCurrentCycleSubjects = (
  currentPlanSubjects: EnrollmentSubject[],
  commencementDate: Date
): EnrollmentSubject[] => {
  const firstEligibleIdx = findFirstEligibleSubject(
    currentPlanSubjects,
    commencementDate
  );

  if (firstEligibleIdx === -1) {
    return [];
  }

  return currentPlanSubjects.slice(firstEligibleIdx).map((s) => ({ ...s }));
};

/**
 * Get catch-up subjects from the next program plan for subjects missed in the current plan
 */
export const getCatchUpSubjects = (
  currentPlanSubjects: EnrollmentSubject[],
  nextPlanSubjects: EnrollmentSubject[],
  commencementDate: Date
): EnrollmentSubject[] => {
  // Find which subjects were missed in the current plan (median_date <= commencement)
  const missedSubjectsInCurrentPlan = currentPlanSubjects.filter(
    (s) => new Date(s.median_date) <= commencementDate
  );

  // Get corresponding subjects from next plan based on sequence order
  const missedSequenceOrders = missedSubjectsInCurrentPlan.map(
    (s) => s.sequence_order
  );

  return nextPlanSubjects
    .filter((s) => missedSequenceOrders.includes(s.sequence_order))
    .map((s) => ({ ...s, isCatchUp: true }));
};

/**
 * Build a set of prerequisite subject IDs
 */
export const getPrerequisiteSubjectIds = (
  subjects: Array<{ subject_id: string; is_prerequisite?: boolean }>
): Set<string> => {
  return new Set<string>(
    subjects
      .filter((s) => Boolean(s.is_prerequisite))
      .map((s) => String(s.subject_id))
  );
};

/**
 * Create aligned prerequisite subjects that match the first scheduled subject's dates
 */
export const alignPrerequisitesWithFirstSubject = (
  prerequisiteSubjectIds: Set<string>,
  allSubjects: EnrollmentSubject[],
  firstScheduled: EnrollmentSubject
): EnrollmentSubject[] => {
  return Array.from(prerequisiteSubjectIds)
    .map((subjectId) => {
      // Find any instance of this subject in allSubjects to copy base fields
      const base = allSubjects.find((s) => s.subject_id === subjectId);
      if (!base) return undefined;

      return {
        ...base,
        start_date: firstScheduled.start_date,
        end_date: firstScheduled.end_date,
        is_prerequisite: true,
        isCatchUp: false,
      } as EnrollmentSubject;
    })
    .filter((s): s is EnrollmentSubject => Boolean(s));
};

/**
 * Filter out prerequisite subjects from a list
 */
export const filterOutPrerequisites = (
  subjects: EnrollmentSubject[],
  prerequisiteSubjectIds: Set<string>
): EnrollmentSubject[] => {
  return subjects.filter((s) => !prerequisiteSubjectIds.has(s.subject_id));
};

/**
 * Calculate the complete enrollment progression
 */
export const calculateProgression = (
  allSubjects: EnrollmentSubject[],
  programPlans: ProgramPlan[],
  commencementDate: Date | undefined,
  timetableId: string | undefined,
  subjects: Array<{ subject_id: string; is_prerequisite?: boolean }>
): {
  currentCycleSubjects: EnrollmentSubject[];
  catchUpSubjects: EnrollmentSubject[];
  prerequisites: EnrollmentSubject[];
  allSubjects: EnrollmentSubject[];
} => {
  // Early return if no commencement date or timetable
  if (!commencementDate || !timetableId || programPlans.length === 0) {
    return {
      currentCycleSubjects: [],
      catchUpSubjects: [],
      prerequisites: [],
      allSubjects: [],
    };
  }

  // Step 1: Sort program plans chronologically
  const sortedPlans = sortProgramPlansByStartDate(programPlans, allSubjects);

  // Step 2: Find which program plan the student's commencement falls into
  const currentPlanIndex = findCurrentPlanIndex(
    sortedPlans,
    allSubjects,
    commencementDate
  );

  const currentPlan = sortedPlans[currentPlanIndex];
  const currentPlanSubjects = allSubjects.filter(
    (s) => s.program_plan_id === currentPlan.id
  );

  // Step 3: Get eligible subjects from current cycle (median rule)
  const currentCycleSubjects = getCurrentCycleSubjects(
    currentPlanSubjects,
    commencementDate
  );

  // Step 4: Get catch-up subjects from next plan (if it exists)
  let catchUpSubjects: EnrollmentSubject[] = [];
  const nextPlanIndex = currentPlanIndex + 1;

  if (nextPlanIndex < sortedPlans.length) {
    const nextPlan = sortedPlans[nextPlanIndex];
    const nextPlanSubjects = allSubjects.filter(
      (s) => s.program_plan_id === nextPlan.id
    );

    catchUpSubjects = getCatchUpSubjects(
      currentPlanSubjects,
      nextPlanSubjects,
      commencementDate
    );
  }

  // Step 5: Handle prerequisites
  const prerequisiteSubjectIds = getPrerequisiteSubjectIds(subjects);
  const firstScheduled =
    currentCycleSubjects.length > 0 ? currentCycleSubjects[0] : undefined;

  if (firstScheduled) {
    // Align prerequisites with the first scheduled subject
    const prereqAligned = alignPrerequisitesWithFirstSubject(
      prerequisiteSubjectIds,
      allSubjects,
      firstScheduled
    );

    // Filter out prerequisites from current and catch-up lists to avoid repeats
    const currentNonPrereq = filterOutPrerequisites(
      currentCycleSubjects,
      prerequisiteSubjectIds
    );
    const catchUpNonPrereq = filterOutPrerequisites(
      catchUpSubjects,
      prerequisiteSubjectIds
    );

    return {
      currentCycleSubjects: currentNonPrereq,
      catchUpSubjects: catchUpNonPrereq,
      prerequisites: prereqAligned,
      allSubjects: [...prereqAligned, ...currentNonPrereq, ...catchUpNonPrereq],
    };
  }

  // If no first scheduled subject exists, keep prerequisites as-is
  const prerequisites = allSubjects.filter((s) => s.is_prerequisite);

  return {
    currentCycleSubjects,
    catchUpSubjects,
    prerequisites,
    allSubjects: [...currentCycleSubjects, ...catchUpSubjects],
  };
};
