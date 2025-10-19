import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Tables } from '@/database.types';

type EnrollmentSubject = Tables<'enrollment_subjects'>;
type Subject = Tables<'subjects'>;
type ProgramPlanSubject = Tables<'program_plan_subjects'>;

export type StudentEnrollmentSubjectRow = EnrollmentSubject & {
  subjects: Subject | null;
  program_plan_subjects: ProgramPlanSubject | null;
  enrollment_id: string;
};

/**
 * Fetch enrollment subjects for a student via their enrollment(s).
 * Joins with program_plan_subjects and subjects to get subject details.
 * @param studentId - Student identifier
 * @returns Array of enrollment subjects with subject code/name
 */
export const useGetStudentEnrollmentSubjects = (studentId?: string) => {
  return useQuery({
    queryKey: ['student-enrollment-subjects', studentId ?? 'none'],
    enabled: Boolean(studentId),
    queryFn: async (): Promise<StudentEnrollmentSubjectRow[]> => {
      if (!studentId) return [];
      const supabase = createClient();

      // First get the student's enrollments
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from('enrollments')
        .select('id')
        .eq('student_id', studentId);

      if (enrollmentsError) throw new Error(enrollmentsError.message);

      if (!enrollments || enrollments.length === 0) return [];

      const enrollmentIds = enrollments.map((e) => e.id);

      // Fetch enrollment subjects with joins
      const { data: enrollmentSubjects, error } = await supabase
        .from('enrollment_subjects')
        .select(
          `
          *,
          program_plan_subjects (
            *,
            subjects (*)
          )
        `
        )
        .in('enrollment_id', enrollmentIds)
        .order('start_date', { ascending: true });

      if (error) throw new Error(error.message);

      return (enrollmentSubjects ?? []).map((es) => ({
        ...es,
        subjects:
          (
            es.program_plan_subjects as
              | (ProgramPlanSubject & { subjects: Subject })
              | null
          )?.subjects ?? null,
        program_plan_subjects:
          es.program_plan_subjects as ProgramPlanSubject | null,
        enrollment_id: es.enrollment_id,
      }));
    },
  });
};
