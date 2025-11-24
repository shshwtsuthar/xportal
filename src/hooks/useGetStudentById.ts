import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Tables } from '@/database.types';

type StudentWithApplicationDisplay = Tables<'students'> & {
  application_id_display?: string | null;
};

/**
 * Fetch a single student by student_id_display with core identity fields.
 */
export const useGetStudentById = (studentIdDisplay: string) => {
  return useQuery({
    queryKey: ['student', studentIdDisplay],
    enabled: Boolean(studentIdDisplay),
    queryFn: async (): Promise<StudentWithApplicationDisplay> => {
      const supabase = createClient();
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('*')
        .eq('student_id_display', studentIdDisplay)
        .single();
      if (studentError) {
        throw new Error(studentError.message);
      }

      // Fetch application_id_display if application_id exists
      let applicationIdDisplay: string | null = null;
      if (student.application_id) {
        const { data: application } = await supabase
          .from('applications')
          .select('application_id_display')
          .eq('id', student.application_id)
          .single();
        applicationIdDisplay = application?.application_id_display || null;
      }

      return {
        ...student,
        application_id_display: applicationIdDisplay,
      } as StudentWithApplicationDisplay;
    },
  });
};
