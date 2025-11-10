import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Tables } from '@/database.types';

/**
 * Fetch disability types for a student.
 */
export const useGetStudentDisabilities = (studentId: string) => {
  return useQuery({
    queryKey: ['student_disabilities', studentId],
    enabled: Boolean(studentId),
    queryFn: async (): Promise<Tables<'student_disabilities'>[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('student_disabilities')
        .select('*')
        .eq('student_id', studentId);

      if (error) {
        throw new Error(error.message);
      }
      return (data as Tables<'student_disabilities'>[]) ?? [];
    },
  });
};
