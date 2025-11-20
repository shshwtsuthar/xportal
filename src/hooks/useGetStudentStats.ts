import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

export type StudentStats = {
  totalStudents: number;
  activeStudents: number;
  studentsToday: number;
  studentsThisWeek: number;
};

/**
 * Fetch student statistics using optimized aggregation queries.
 * This avoids fetching all student records and calculates stats server-side.
 */
export const useGetStudentStats = () => {
  return useQuery({
    queryKey: ['student-stats'],
    queryFn: async (): Promise<StudentStats> => {
      const supabase = createClient();

      // Get current date boundaries for filtering
      const now = new Date();
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7)); // Monday
      weekStart.setHours(0, 0, 0, 0);

      // Fetch counts using aggregation (much faster than fetching all rows)
      const [totalRes, activeRes, todayRes, weekRes] = await Promise.all([
        // Total students count
        supabase.from('students').select('*', { count: 'exact', head: true }),
        // Active students count
        supabase
          .from('students')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'ACTIVE'),
        // Students created today
        supabase
          .from('students')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', todayStart.toISOString()),
        // Students created this week
        supabase
          .from('students')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', weekStart.toISOString()),
      ]);

      if (totalRes.error) throw new Error(totalRes.error.message);
      if (activeRes.error) throw new Error(activeRes.error.message);
      if (todayRes.error) throw new Error(todayRes.error.message);
      if (weekRes.error) throw new Error(weekRes.error.message);

      return {
        totalStudents: totalRes.count ?? 0,
        activeStudents: activeRes.count ?? 0,
        studentsToday: todayRes.count ?? 0,
        studentsThisWeek: weekRes.count ?? 0,
      };
    },
  });
};
