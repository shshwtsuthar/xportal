import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Tables } from '@/database.types';

/**
 * Fetch enrollments for a student (basic overview).
 */
export const useGetStudentEnrollments = (studentId: string) => {
  return useQuery({
    queryKey: ['student_enrollments', studentId],
    enabled: Boolean(studentId),
    queryFn: async (): Promise<Tables<'enrollments'>[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('enrollments')
        .select('*')
        .eq('student_id', studentId)
        .order('commencement_date', { ascending: false });
      if (error) {
        throw new Error(error.message);
      }
      return data ?? [];
    },
  });
};
