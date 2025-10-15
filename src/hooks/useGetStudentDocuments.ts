import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Tables } from '@/database.types';

/**
 * Fetch student documents metadata.
 */
export const useGetStudentDocuments = (studentId: string) => {
  return useQuery({
    queryKey: ['student_documents', studentId],
    enabled: Boolean(studentId),
    queryFn: async (): Promise<Tables<'student_documents'>[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('student_documents')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });
      if (error) {
        throw new Error(error.message);
      }
      return data ?? [];
    },
  });
};
