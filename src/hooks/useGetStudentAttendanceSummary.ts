import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Tables } from '@/database.types';

type EnrollmentClass = Tables<'enrollment_classes'>;
type Attendance = Tables<'enrollment_class_attendances'>;
type Subject = Tables<'subjects'>;

export type StudentAttendanceRow = EnrollmentClass & {
  enrollment_class_attendances?: Pick<Attendance, 'id' | 'present'> | null;
  program_plan_classes: {
    program_plan_subjects: {
      subjects: Pick<Subject, 'id' | 'code' | 'name'> | null;
    } | null;
  } | null;
};

export type SubjectAttendanceAggregate = {
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  total: number;
  present: number;
  absent: number;
  unmarked: number;
  percentagePresent: number; // 0..100
};

export type StudentAttendanceSummary = {
  rows: StudentAttendanceRow[];
  aggregates: SubjectAttendanceAggregate[];
};

/**
 * Fetch student attendance rows and compute subject-level aggregates.
 */
const isUuid = (s: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    s
  );

export const useGetStudentAttendanceSummary = (studentId?: string) => {
  const normalizedId = (studentId ?? '').trim();
  const enabled = Boolean(normalizedId && isUuid(normalizedId));

  const query = useQuery({
    queryKey: ['attendance-student', enabled ? normalizedId : 'none'],
    enabled,
    queryFn: async (): Promise<StudentAttendanceRow[]> => {
      if (!enabled) return [];
      const supabase = createClient();

      const { data, error } = await supabase
        .from('enrollment_classes')
        .select(
          `
          *,
          enrollment_class_attendances(id, present),
          program_plan_classes(
            program_plan_subjects(
              subjects(id, code, name)
            )
          ),
          enrollments!inner(
            id,
            student_id
          )
        `
        )
        .eq('enrollments.student_id', normalizedId)
        .order('class_date', { ascending: true });

      if (error) throw new Error(error.message);

      return (data ?? []).map((row) => ({
        ...row,
        enrollment_class_attendances: Array.isArray(
          row.enrollment_class_attendances
        )
          ? (row.enrollment_class_attendances[0] ?? null)
          : (row.enrollment_class_attendances ?? null),
        program_plan_classes:
          row.program_plan_classes as StudentAttendanceRow['program_plan_classes'],
      }));
    },
  });

  const aggregates = useMemo<SubjectAttendanceAggregate[]>(() => {
    if (!query.data) return [];
    const map = new Map<string, SubjectAttendanceAggregate>();
    for (const row of query.data) {
      const subject = row.program_plan_classes?.program_plan_subjects?.subjects;
      if (!subject) continue;
      const key = subject.id;
      if (!map.has(key)) {
        map.set(key, {
          subjectId: subject.id,
          subjectCode: subject.code,
          subjectName: subject.name,
          total: 0,
          present: 0,
          absent: 0,
          unmarked: 0,
          percentagePresent: 0,
        });
      }
      const agg = map.get(key)!;
      agg.total += 1;
      const val = row.enrollment_class_attendances?.present;
      if (val === true) agg.present += 1;
      else if (val === false) agg.absent += 1;
      else agg.unmarked += 1;
    }
    for (const agg of map.values()) {
      agg.percentagePresent = agg.total
        ? Math.round((agg.present / agg.total) * 100)
        : 0;
    }
    return Array.from(map.values());
  }, [query.data]);

  return {
    rows: query.data ?? [],
    aggregates,
    isLoading: query.isLoading,
    isError: query.isError,
  } satisfies StudentAttendanceSummary & {
    isLoading: boolean;
    isError: boolean;
  } as StudentAttendanceSummary & { isLoading: boolean; isError: boolean };
};
