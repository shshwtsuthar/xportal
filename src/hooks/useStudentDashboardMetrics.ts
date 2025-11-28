import { useMemo } from 'react';
import { useGetStudentEnrollmentSubjects } from '@/src/hooks/useGetStudentEnrollmentSubjects';
import { useGetStudentAttendanceSummary } from '@/src/hooks/useGetStudentAttendanceSummary';

export type StudentDashboardMetrics = {
  courseProgress: {
    percentage: number;
    completedSubjects: number;
    totalSubjects: number;
  };
  attendance: {
    percentage: number;
    attendedClasses: number;
    totalPastClasses: number;
  };
  competency: {
    competentUnits: number;
    totalUnits: number;
    percentage: number;
    remainingUnits: number;
  };
  isLoading: boolean;
  isError: boolean;
};

/**
 * Compute high-level student dashboard metrics from existing enrollment and attendance hooks.
 *
 * - Course progress: subjects where `end_date` is in the past (relative to now) vs total subjects.
 * - Attendance: classes where `class_date` is before today vs how many of those were attended.
 * - Competency: subjects where `outcome_code === 'C'` vs total subjects, plus remaining units.
 *
 * @param studentId - The student's UUID.
 * @returns Aggregated metrics and loading/error flags.
 */
export const useStudentDashboardMetrics = (
  studentId?: string
): StudentDashboardMetrics => {
  const {
    data: enrollmentSubjects = [],
    isLoading: isSubjectsLoading,
    isError: isSubjectsError,
  } = useGetStudentEnrollmentSubjects(studentId);

  const {
    rows: attendanceRows,
    isLoading: isAttendanceLoading,
    isError: isAttendanceError,
  } = useGetStudentAttendanceSummary(studentId);

  const metrics = useMemo<StudentDashboardMetrics>(() => {
    const now = new Date();

    // --- Course progress ---
    const totalSubjects = enrollmentSubjects.length;
    const completedSubjects = enrollmentSubjects.filter((subject) => {
      const rawEndDate = subject.end_date as string | null;
      if (!rawEndDate) return false;
      const endDate = new Date(rawEndDate);
      if (Number.isNaN(endDate.getTime())) return false;
      return endDate.getTime() < now.getTime();
    }).length;

    const courseProgressPercentage =
      totalSubjects > 0
        ? Math.round((completedSubjects / totalSubjects) * 100)
        : 0;

    // --- Attendance ---
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const pastClasses = attendanceRows.filter((row) => {
      const rawDate = row.class_date as string | null;
      if (!rawDate) return false;
      const classDate = new Date(rawDate);
      if (Number.isNaN(classDate.getTime())) return false;
      return classDate.getTime() < today.getTime();
    });

    const totalPastClasses = pastClasses.length;
    const attendedClasses = pastClasses.filter(
      (row) => row.enrollment_class_attendances?.present === true
    ).length;

    const attendancePercentage =
      totalPastClasses > 0
        ? Math.round((attendedClasses / totalPastClasses) * 100)
        : 0;

    // --- Competency ---
    const totalUnits = totalSubjects;
    const competentUnits = enrollmentSubjects.filter(
      (subject) => subject.outcome_code === 'C'
    ).length;
    const remainingUnits = Math.max(totalUnits - competentUnits, 0);

    const competencyPercentage =
      totalUnits > 0 ? Math.round((competentUnits / totalUnits) * 100) : 0;

    return {
      courseProgress: {
        percentage: courseProgressPercentage,
        completedSubjects,
        totalSubjects,
      },
      attendance: {
        percentage: attendancePercentage,
        attendedClasses,
        totalPastClasses,
      },
      competency: {
        competentUnits,
        totalUnits,
        percentage: competencyPercentage,
        remainingUnits,
      },
      isLoading: isSubjectsLoading || isAttendanceLoading,
      isError: isSubjectsError || isAttendanceError,
    };
  }, [
    attendanceRows,
    enrollmentSubjects,
    isAttendanceLoading,
    isAttendanceError,
    isSubjectsLoading,
    isSubjectsError,
  ]);

  return metrics;
};
