import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Tables } from '@/database.types';

/**
 * Fetch CRICOS compliance data for a student (international only).
 */
export const useGetStudentCricos = (studentId: string) => {
  return useQuery({
    queryKey: ['student_cricos', studentId],
    enabled: Boolean(studentId),
    queryFn: async (): Promise<Tables<'student_cricos'> | null> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('student_cricos')
        .select('*')
        .eq('student_id', studentId)
        .single();
      if (error && error.code !== 'PGRST116') {
        throw new Error(error.message);
      }
      return (data as Tables<'student_cricos'>) ?? null;
    },
  });
};
