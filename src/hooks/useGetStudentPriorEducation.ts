import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Tables } from '@/database.types';

/**
 * Fetch prior education achievements for a student.
 */
export const useGetStudentPriorEducation = (studentId: string) => {
  return useQuery({
    queryKey: ['student_prior_education', studentId],
    enabled: Boolean(studentId),
    queryFn: async (): Promise<Tables<'student_prior_education'>[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('student_prior_education')
        .select('*')
        .eq('student_id', studentId);

      if (error) {
        throw new Error(error.message);
      }
      return (data as Tables<'student_prior_education'>[]) ?? [];
    },
  });
};
