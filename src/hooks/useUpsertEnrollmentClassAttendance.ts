import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

type UpsertArgs = {
  enrollmentClassId: string;
  present: boolean | null;
  // Optional: keys to invalidate
  invalidateKeys?: Array<unknown[]>;
};

/**
 * Upsert attendance for a specific enrollment class.
 * present: true=present, false=absent, null=unmarked (reset)
 */
export const useUpsertEnrollmentClassAttendance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ enrollmentClassId, present }: UpsertArgs) => {
      const supabase = createClient();

      // If null => set present to null via upsert to keep history/triggering
      const { error } = await supabase
        .from('enrollment_class_attendances')
        .upsert(
          {
            enrollment_class_id: enrollmentClassId,
            present,
          },
          { onConflict: 'enrollment_class_id' }
        );

      if (error) throw new Error(error.message);
    },
    onSuccess: (_data, variables) => {
      // Common invalidations — callers can add more via invalidateKeys
      queryClient.invalidateQueries({
        queryKey: ['enrollment-subject-classes'],
      });
      if (variables?.invalidateKeys) {
        for (const key of variables.invalidateKeys) {
          queryClient.invalidateQueries({ queryKey: key });
        }
      }
    },
  });
};
