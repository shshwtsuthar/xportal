import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Tables } from '@/database.types';

/**
 * Fetch AVETMISS demographics for a student.
 * NAT00080/00085-related fields are stored here.
 */
export const useGetStudentAvetmiss = (studentId: string) => {
  return useQuery({
    queryKey: ['student_avetmiss', studentId],
    enabled: Boolean(studentId),
    queryFn: async (): Promise<Tables<'student_avetmiss'> | null> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('student_avetmiss')
        .select('*')
        .eq('student_id', studentId)
        .single();
      if (error && error.code !== 'PGRST116') {
        // not found vs real error
        throw new Error(error.message);
      }
      return (data as Tables<'student_avetmiss'>) ?? null;
    },
  });
};
