import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Tables, TablesInsert } from '@/database.types';

// Omit application_id_display from Insert type since trigger generates it
type ApplicationInsert = Omit<
  TablesInsert<'applications'>,
  'application_id_display'
>;

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
      // Exclude application_id_display - trigger will generate it automatically
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { application_id_display: _, ...initialDataWithoutDisplayId } =
        initialData || {};

      // If preferred_location_id is not provided or is null/empty, get the first available location for this RTO
      let preferredLocationId =
        initialDataWithoutDisplayId.preferred_location_id;
      if (!preferredLocationId) {
        const { data: locations, error: locError } = await supabase
          .from('delivery_locations')
          .select('id')
          .eq('rto_id', rtoId)
          .order('name', { ascending: true })
          .limit(1);

        if (locError) {
          console.error('Error fetching default location:', locError);
          throw new Error(
            'Failed to get default location. Please ensure at least one location exists for your RTO.'
          );
        }

        if (!locations || locations.length === 0) {
          throw new Error(
            'No locations available. Please create at least one location before creating applications.'
          );
        }

        preferredLocationId = locations[0].id;
      }

      const applicationData: ApplicationInsert = {
        status: 'DRAFT' as const,
        rto_id: rtoId,
        preferred_location_id: preferredLocationId,
        ...initialDataWithoutDisplayId, // Include any initial form data (excluding application_id_display)
      };

      console.log('Creating application with data:', applicationData);

      const { data, error } = await supabase
        .from('applications')
        .insert(applicationData as unknown as TablesInsert<'applications'>) // Type assertion needed because Insert type requires application_id_display, but trigger generates it
        .select('*')
        .single();

      if (error) {
        console.error('Database error creating application:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        console.error('Application data attempted:', applicationData);
        throw new Error(
          error.message ||
            error.hint ||
            `Database error: ${error.code || 'Unknown error'}. Check console for details.`
        );
      }

      if (!data) {
        throw new Error('No data returned from database after insert');
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
    },
  });
};
