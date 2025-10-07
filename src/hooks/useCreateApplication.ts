import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Tables } from '@/database.types';

/**
 * Insert a new DRAFT application for the current user's RTO context.
 */
export const useCreateApplication = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      initialData?: Partial<Tables<'applications'>>
    ): Promise<Tables<'applications'>> => {
      console.log(
        'useCreateApplication mutationFn called with initialData:',
        initialData
      );

      const supabase = createClient();

      // Get user with retry logic
      let session;
      let attempts = 0;
      const maxAttempts = 3;

      while (attempts < maxAttempts) {
        const { data: sessionData, error: sessionError } =
          await supabase.auth.getUser();
        if (sessionError) {
          console.error(
            `Session error (attempt ${attempts + 1}):`,
            sessionError
          );
          attempts++;
          if (attempts >= maxAttempts)
            throw new Error('Failed to get user session');
          await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second
          continue;
        }
        session = sessionData;
        break;
      }

      if (!session?.user) {
        throw new Error('No user session found');
      }

      const rtoId = (
        session.user?.app_metadata as Record<string, unknown> | undefined
      )?.rto_id as string | undefined;
      if (!rtoId) {
        throw new Error(
          'User RTO not found in metadata. Please contact your administrator.'
        );
      }

      // Create application with initial data if provided
      const applicationData = {
        status: 'DRAFT' as const,
        rto_id: rtoId,
        ...initialData, // Include any initial form data
      };

      console.log('Creating application with data:', applicationData);

      const { data, error } = await supabase
        .from('applications')
        .insert(applicationData)
        .select('*')
        .single();

      if (error) {
        console.error('Database error creating application:', error);
        throw new Error(error.message);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
    },
  });
};
