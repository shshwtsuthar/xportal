import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { queryKeys } from '@/src/lib/queryKeys';

type DisabilityInput = {
  disability_type_id: string;
};

type PriorEducationInput = {
  prior_achievement_id: string;
  recognition_type?: string;
};

type PersistArraysPayload = {
  applicationId: string;
  disabilities: DisabilityInput[];
  priorEducation: PriorEducationInput[];
};

/**
 * Hook to persist disabilities and prior education to junction tables.
 * This hook properly invalidates React Query cache after persisting.
 */
export const usePersistApplicationArrays = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      applicationId,
      disabilities,
      priorEducation,
    }: PersistArraysPayload): Promise<void> => {
      const supabase = createClient();

      // Get the RTO ID from the user's session
      const { data: sessionData } = await supabase.auth.getSession();
      const rtoId = (
        sessionData.session?.user?.app_metadata as Record<string, unknown>
      )?.rto_id as string;

      if (!rtoId) {
        throw new Error('User RTO not found in session metadata.');
      }

      console.log('=== PERSISTING DISABILITIES & PRIOR EDUCATION ===');
      console.log('Application ID:', applicationId);
      console.log('RTO ID:', rtoId);
      console.log('Form disabilities:', disabilities);
      console.log('Form prior education:', priorEducation);

      // Handle disabilities
      // Delete all existing disabilities for this application
      const { error: deleteDisErr } = await supabase
        .from('application_disabilities')
        .delete()
        .eq('application_id', applicationId);

      if (deleteDisErr) {
        console.error('Error deleting existing disabilities:', deleteDisErr);
        throw new Error(`Failed to save disabilities: ${deleteDisErr.message}`);
      }

      // Insert new disabilities from form state
      if (disabilities.length > 0) {
        const disabilityInserts = disabilities.map((d) => ({
          application_id: applicationId,
          rto_id: rtoId,
          disability_type_id: d.disability_type_id,
        }));

        const { error: insertDisErr } = await supabase
          .from('application_disabilities')
          .insert(disabilityInserts);

        if (insertDisErr) {
          console.error('Error inserting disabilities:', insertDisErr);
          throw new Error(
            `Failed to save disabilities: ${insertDisErr.message}`
          );
        }

        console.log(
          'Successfully inserted',
          disabilityInserts.length,
          'disabilities'
        );
      }

      // Handle prior education
      console.log('Prior education array length:', priorEducation.length);

      // Delete all existing prior education for this application
      const { error: deletePriorEdErr } = await supabase
        .from('application_prior_education')
        .delete()
        .eq('application_id', applicationId);

      if (deletePriorEdErr) {
        console.error(
          'Error deleting existing prior education:',
          deletePriorEdErr
        );
        throw new Error(
          `Failed to save prior education: ${deletePriorEdErr.message}`
        );
      }

      // Insert new prior education from form state
      if (priorEducation.length > 0) {
        const priorEdInserts = priorEducation.map((e) => ({
          application_id: applicationId,
          rto_id: rtoId,
          prior_achievement_id: e.prior_achievement_id,
          recognition_type: e.recognition_type || null,
        }));

        console.log('Prior education inserts to be saved:', priorEdInserts);

        const { error: insertPriorEdErr, data: insertedData } = await supabase
          .from('application_prior_education')
          .insert(priorEdInserts)
          .select();

        if (insertPriorEdErr) {
          console.error('Error inserting prior education:', insertPriorEdErr);
          console.error(
            'Error details:',
            JSON.stringify(insertPriorEdErr, null, 2)
          );
          throw new Error(
            `Failed to save prior education: ${insertPriorEdErr.message}`
          );
        }

        console.log(
          'Successfully inserted',
          priorEdInserts.length,
          'prior education records'
        );
        console.log('Inserted data:', insertedData);
      } else {
        console.log('No prior education records to insert (array is empty)');
      }
    },
    onSuccess: (_, variables) => {
      // Invalidate queries to ensure UI shows fresh data
      queryClient.invalidateQueries({
        queryKey: queryKeys.applicationDisabilities(variables.applicationId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.applicationPriorEducation(variables.applicationId),
      });
    },
    onError: (error) => {
      console.error(
        'Error persisting disabilities and prior education:',
        error
      );
      toast.error(
        `Failed to save additional info: ${error instanceof Error ? error.message : String(error)}`
      );
    },
  });
};
