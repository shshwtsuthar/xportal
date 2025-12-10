import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

type OrientationPayload = {
  studentId: string;
  orientationCompleted: boolean;
};

/**
 * Update a student's orientation completion flag.
 *
 * @param studentId - UUID of the student record.
 * @param orientationCompleted - Desired orientation state.
 * @returns Mutation object with loading and error states.
 */
export const useUpdateStudentOrientation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      studentId,
      orientationCompleted,
    }: OrientationPayload) => {
      const supabase = createClient();
      const { error } = await supabase
        .from('students')
        .update({ orientation_completed: orientationCompleted })
        .eq('id', studentId);

      if (error) {
        throw new Error(error.message);
      }

      return orientationCompleted;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
  });
};
