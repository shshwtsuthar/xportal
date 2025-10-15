import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Tables } from '@/database.types';

/**
 * Fetch student street/postal addresses by student_id.
 */
export const useGetStudentAddresses = (studentId: string) => {
  return useQuery({
    queryKey: ['student_addresses', studentId],
    enabled: Boolean(studentId),
    queryFn: async (): Promise<Tables<'student_addresses'>[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('student_addresses')
        .select('*')
        .eq('student_id', studentId)
        .order('is_primary', { ascending: false });
      if (error) {
        throw new Error(error.message);
      }
      return data ?? [];
    },
  });
};
