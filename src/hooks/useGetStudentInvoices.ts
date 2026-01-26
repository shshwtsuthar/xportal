import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Tables } from '@/database.types';

/**
 * Fetches invoices for a given student, ordered by due date.
 * @param studentId The student id
 * @returns TanStack Query for the invoices array
 */
export const useGetStudentInvoices = (studentId?: string) => {
  return useQuery({
    queryKey: ['student-invoices', studentId],
    enabled: !!studentId,
    queryFn: async (): Promise<Tables<'enrollment_invoices'>[]> => {
      const supabase = createClient();

      // First, fetch enrollment IDs for the student
      const { data: enrollments, error: enrollError } = await supabase
        .from('enrollments')
        .select('id')
        .eq('student_id', studentId!);

      if (enrollError) {
        throw new Error(enrollError.message);
      }

      const enrollmentIds = enrollments?.map((e) => e.id) ?? [];

      // If no enrollments, return empty array
      if (enrollmentIds.length === 0) {
        return [];
      }

      // Now fetch invoices for those enrollments
      const { data, error } = await supabase
        .from('enrollment_invoices')
        .select('*')
        .in('enrollment_id', enrollmentIds)
        .order('due_date', { ascending: true });

      if (error) {
        throw new Error(error.message);
      }
      return data ?? [];
    },
  });
};
