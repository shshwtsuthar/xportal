import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

type Payload = { applicationId: string };

/**
 * Approves an ACCEPTED application by invoking the approve-application Edge Function.
 * On success: invalidates application and applications queries.
 */
export const useApproveApplication = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ applicationId }: Payload) => {
      const supabase = createClient();
      const { data, error } = await supabase.functions.invoke(
        'approve-application',
        { body: { applicationId } }
      );
      if (error) throw new Error(error.message);
      return data as { studentId: string; enrollmentId: string };
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['application', variables.applicationId],
      });
      queryClient.invalidateQueries({ queryKey: ['applications'] });
    },
  });
};
