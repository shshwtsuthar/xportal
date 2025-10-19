import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Tables } from '@/database.types';

type EnrollmentClass = Tables<'enrollment_classes'>;
type DeliveryLocation = Tables<'delivery_locations'>;
type Classroom = Tables<'classrooms'>;
type Program = Tables<'programs'>;
type Student = Tables<'students'>;
type Subject = Tables<'subjects'>;
type Attendance = Tables<'enrollment_class_attendances'>;

export type TodayAttendanceRow = EnrollmentClass & {
  delivery_locations: Pick<DeliveryLocation, 'name'> | null;
  classrooms: Pick<Classroom, 'name'> | null;
  enrollment_class_attendances?: Pick<Attendance, 'id' | 'present'> | null;
  enrollments: {
    id: string;
    programs: Pick<Program, 'id' | 'code' | 'name'> | null;
    students: Pick<Student, 'id' | 'first_name' | 'last_name'> | null;
  } | null;
  program_plan_classes: {
    program_plan_subjects: {
      subjects: Pick<Subject, 'id' | 'code' | 'name'> | null;
    } | null;
  } | null;
};

export type TodayFilters = {
  dateISO?: string; // yyyy-MM-dd, defaults to today
  programId?: string;
  trainerId?: string;
  studentId?: string;
};

/**
 * Fetch today's classes with program, subject, student, and attendance.
 */
export const useGetTodayClassesForAttendance = (filters?: TodayFilters) => {
  return useQuery({
    queryKey: ['attendance-today', filters ?? {}],
    queryFn: async (): Promise<TodayAttendanceRow[]> => {
      const supabase = createClient();

      // Resolve date filter
      const today = new Date();
      const dateISO = filters?.dateISO ?? today.toISOString().slice(0, 10); // yyyy-MM-dd

      let query = supabase
        .from('enrollment_classes')
        .select(
          `
          *,
          delivery_locations(name),
          classrooms(name),
          enrollment_class_attendances(id, present),
          enrollments!inner(
            id,
            programs:programs(id, code, name),
            students:students(id, first_name, last_name)
          ),
          program_plan_classes(
            program_plan_subjects(
              subjects(id, code, name)
            )
          )
        `
        )
        .eq('class_date', dateISO)
        .order('start_time', { ascending: true });

      if (filters?.programId && filters.programId !== 'all') {
        query = query.eq('enrollments.program_id', filters.programId);
      }
      if (filters?.trainerId && filters.trainerId !== 'all') {
        query = query.eq('trainer_id', filters.trainerId);
      }
      if (filters?.studentId) {
        query = query.eq('enrollments.students.id', filters.studentId);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);

      return (data ?? []).map((row) => ({
        ...row,
        delivery_locations:
          row.delivery_locations as TodayAttendanceRow['delivery_locations'],
        classrooms: row.classrooms as TodayAttendanceRow['classrooms'],
        enrollment_class_attendances: Array.isArray(
          row.enrollment_class_attendances
        )
          ? (row.enrollment_class_attendances[0] ?? null)
          : (row.enrollment_class_attendances ?? null),
        enrollments: row.enrollments as TodayAttendanceRow['enrollments'],
        program_plan_classes:
          row.program_plan_classes as TodayAttendanceRow['program_plan_classes'],
      }));
    },
  });
};
