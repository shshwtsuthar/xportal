'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Tables } from '@/database.types';

type EnrollmentClass = Tables<'enrollment_classes'>;
type DeliveryLocation = Tables<'delivery_locations'>;
type Classroom = Tables<'classrooms'>;
type Attendance = Tables<'enrollment_class_attendances'>;

export type StudentEnrollmentClassRow = EnrollmentClass & {
  delivery_locations: DeliveryLocation | null;
  classrooms: Classroom | null;
  enrollment_class_attendances?: Pick<Attendance, 'id' | 'present'> | null;
};

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );

/**
 * Fetch every enrollment class for the given student, including location,
 * classroom, and attendance information. Used for the Attendance tab.
 * @param studentId - UUID of the student
 * @returns Query result containing enrollment classes
 */
export const useGetStudentAllClasses = (studentId?: string) => {
  const normalizedId = (studentId ?? '').trim();
  const enabled = Boolean(normalizedId && isUuid(normalizedId));

  return useQuery({
    queryKey: ['student-all-classes', enabled ? normalizedId : 'none'],
    enabled,
    queryFn: async (): Promise<StudentEnrollmentClassRow[]> => {
      if (!enabled) return [];

      const supabase = createClient();
      const { data, error } = await supabase
        .from('enrollment_classes')
        .select(
          `
          *,
          delivery_locations(name),
          classrooms(name),
          enrollment_class_attendances(id, present),
          enrollments!inner(
            student_id
          )
        `
        )
        .eq('enrollments.student_id', normalizedId)
        .order('class_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) {
        throw new Error(error.message);
      }

      return (data ?? []).map((row) => ({
        ...row,
        delivery_locations: row.delivery_locations as DeliveryLocation | null,
        classrooms: row.classrooms as Classroom | null,
        enrollment_class_attendances: Array.isArray(
          row.enrollment_class_attendances
        )
          ? (row.enrollment_class_attendances[0] ?? null)
          : (row.enrollment_class_attendances ?? null),
      }));
    },
  });
};
