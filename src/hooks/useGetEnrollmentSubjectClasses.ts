import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Tables } from '@/database.types';

type EnrollmentClass = Tables<'enrollment_classes'>;
type ProgramPlanClass = Tables<'program_plan_classes'>;
type DeliveryLocation = Tables<'delivery_locations'>;
type Classroom = Tables<'classrooms'>;
type Attendance = Tables<'enrollment_class_attendances'>;

export type EnrollmentClassWithDetails = EnrollmentClass & {
  program_plan_classes: ProgramPlanClass;
  delivery_locations: DeliveryLocation | null;
  classrooms: Classroom | null;
  enrollment_class_attendances?: Pick<Attendance, 'id' | 'present'> | null;
};

/**
 * Fetch enrollment classes for a specific subject within an enrollment.
 * Joins with program_plan_classes to filter by program_plan_subject_id,
 * and includes location and classroom details for display.
 * @param enrollmentId - The enrollment identifier
 * @param programPlanSubjectId - The program plan subject identifier
 * @returns Array of enrollment classes with related details
 */
export const useGetEnrollmentSubjectClasses = (
  enrollmentId?: string,
  programPlanSubjectId?: string
) => {
  return useQuery({
    queryKey: [
      'enrollment-subject-classes',
      enrollmentId,
      programPlanSubjectId,
    ],
    enabled: Boolean(enrollmentId && programPlanSubjectId),
    queryFn: async (): Promise<EnrollmentClassWithDetails[]> => {
      if (!enrollmentId || !programPlanSubjectId) return [];

      const supabase = createClient();

      const { data: enrollmentClasses, error } = await supabase
        .from('enrollment_classes')
        .select(
          `
          *,
          program_plan_classes!inner(
            program_plan_subject_id
          ),
          delivery_locations(
            name
          ),
          classrooms(
            name
          ),
          enrollment_class_attendances(
            id, present
          )
        `
        )
        .eq('enrollment_id', enrollmentId)
        .eq(
          'program_plan_classes.program_plan_subject_id',
          programPlanSubjectId
        )
        .order('class_date', { ascending: true });

      if (error) {
        throw new Error(error.message);
      }

      return (enrollmentClasses ?? []).map((ec) => ({
        ...ec,
        program_plan_classes: ec.program_plan_classes as ProgramPlanClass,
        delivery_locations: ec.delivery_locations as DeliveryLocation | null,
        classrooms: ec.classrooms as Classroom | null,
        enrollment_class_attendances: Array.isArray(
          ec.enrollment_class_attendances
        )
          ? (ec.enrollment_class_attendances[0] ?? null)
          : (ec.enrollment_class_attendances ?? null),
      }));
    },
  });
};
