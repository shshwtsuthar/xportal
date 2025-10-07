import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

type Payload = { applicationId: string };

/**
 * Calls the submit-application Edge Function to perform final validation and status transition.
 */
export const useSubmitApplication = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ applicationId }: Payload) => {
      console.log(
        'useSubmitApplication mutationFn called with applicationId:',
        applicationId
      );

      const supabase = createClient();
      console.log('Calling supabase.functions.invoke with submit-application');

      const { data, error } = await supabase.functions.invoke(
        'submit-application',
        {
          body: { applicationId },
        }
      );

      console.log('Edge function response:', { data, error });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message);
      }

      return data as { message?: string };
    },
    onSuccess: (_data, variables) => {
      console.log('Submit mutation success, invalidating queries');
      queryClient.invalidateQueries({
        queryKey: ['application', variables.applicationId],
      });
      queryClient.invalidateQueries({ queryKey: ['applications'] });
    },
    onError: (error) => {
      console.error('Submit mutation error:', error);
    },
  });
};
