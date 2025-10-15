import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Tables } from '@/database.types';

export type EmergencyContact = Tables<'student_contacts_emergency'>;
export type GuardianContact = Tables<'student_contacts_guardians'>;

/**
 * Fetch emergency and guardian contacts for a student.
 */
export const useGetStudentContacts = (studentId: string) => {
  return useQuery({
    queryKey: ['student_contacts', studentId],
    enabled: Boolean(studentId),
    queryFn: async (): Promise<{
      emergency: EmergencyContact[];
      guardians: GuardianContact[];
    }> => {
      const supabase = createClient();

      const [ecRes, gRes] = await Promise.all([
        supabase
          .from('student_contacts_emergency')
          .select('*')
          .eq('student_id', studentId),
        supabase
          .from('student_contacts_guardians')
          .select('*')
          .eq('student_id', studentId),
      ]);

      if (ecRes.error) throw new Error(ecRes.error.message);
      if (gRes.error) throw new Error(gRes.error.message);

      return { emergency: ecRes.data ?? [], guardians: gRes.data ?? [] };
    },
  });
};
