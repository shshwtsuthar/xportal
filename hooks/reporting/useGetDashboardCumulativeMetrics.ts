import { useQuery } from '@tanstack/react-query';

import { Tables } from '@/database.types';
import { createClient } from '@/lib/supabase/client';
import { formatDateToLocal } from '@/lib/utils/date';

type ApplicationRow = Pick<Tables<'applications'>, 'created_at'>;
type StudentRow = Pick<Tables<'students'>, 'created_at'>;

export type DashboardCumulativePoint = {
  date: string;
  applications: number;
  students: number;
};

const getYearToDateRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);

  return {
    start,
    end: now,
  };
};

const buildDailyCumulativeSeries = (
  applications: ApplicationRow[],
  students: StudentRow[],
  start: Date,
  end: Date
): DashboardCumulativePoint[] => {
  const applicationsByDate = new Map<string, number>();
  const studentsByDate = new Map<string, number>();

  for (const application of applications) {
    if (!application.created_at) {
      continue;
    }

    const key = formatDateToLocal(new Date(application.created_at));
    applicationsByDate.set(key, (applicationsByDate.get(key) ?? 0) + 1);
  }

  for (const student of students) {
    if (!student.created_at) {
      continue;
    }

    const key = formatDateToLocal(new Date(student.created_at));
    studentsByDate.set(key, (studentsByDate.get(key) ?? 0) + 1);
  }

  const points: DashboardCumulativePoint[] = [];
  const cursor = new Date(
    start.getFullYear(),
    start.getMonth(),
    start.getDate()
  );

  let runningApplications = 0;
  let runningStudents = 0;

  while (cursor <= end) {
    const key = formatDateToLocal(cursor);

    runningApplications += applicationsByDate.get(key) ?? 0;
    runningStudents += studentsByDate.get(key) ?? 0;

    points.push({
      date: key,
      applications: runningApplications,
      students: runningStudents,
    });

    cursor.setDate(cursor.getDate() + 1);
  }

  return points;
};

export const useGetDashboardCumulativeMetrics = () => {
  return useQuery({
    queryKey: ['dashboard', 'cumulative-metrics'],
    queryFn: async (): Promise<DashboardCumulativePoint[]> => {
      const supabase = createClient();
      const { start, end } = getYearToDateRange();

      const startIso = new Date(
        Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())
      ).toISOString();

      const [applicationsResult, studentsResult] = await Promise.all([
        supabase
          .from('applications')
          .select('created_at')
          .gte('created_at', startIso)
          .order('created_at', { ascending: true }),
        supabase
          .from('students')
          .select('created_at')
          .gte('created_at', startIso)
          .order('created_at', { ascending: true }),
      ]);

      if (applicationsResult.error) {
        throw new Error(applicationsResult.error.message);
      }

      if (studentsResult.error) {
        throw new Error(studentsResult.error.message);
      }

      return buildDailyCumulativeSeries(
        applicationsResult.data ?? [],
        studentsResult.data ?? [],
        start,
        end
      );
    },
  });
};
