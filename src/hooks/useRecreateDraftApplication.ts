import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

type Payload = { applicationId: string };

type RecreateDraftResponse = {
  success: true;
  newApplicationId: string;
  newApplicationDisplayId: string;
  warnings?: string[];
};

/**
 * Calls the recreate-draft-application Edge Function to duplicate an application
 * and all its related data, creating a new draft application.
 */
export const useRecreateDraftApplication = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      applicationId,
    }: Payload): Promise<RecreateDraftResponse> => {
      const supabase = createClient();

      const { data, error } = await supabase.functions.invoke(
        'recreate-draft-application',
        {
          body: { applicationId },
        }
      );

      if (error) {
        throw new Error(error.message);
      }

      if (!data || !data.success) {
        throw new Error(data?.error || 'Failed to recreate draft application');
      }

      return data as RecreateDraftResponse;
    },
    onSuccess: () => {
      // Invalidate applications list to show the new draft
      queryClient.invalidateQueries({ queryKey: ['applications'] });
    },
    onError: (error) => {
      console.error('Recreate draft mutation error:', error);
    },
  });
};
