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

      // Handle disabilities using diff-based approach to avoid race conditions
      // Fetch existing disabilities from database
      const { data: existingDisabilitiesData, error: fetchDisErr } =
        await supabase
          .from('application_disabilities')
          .select('disability_type_id')
          .eq('application_id', applicationId);

      if (fetchDisErr) {
        console.error('Error fetching existing disabilities:', fetchDisErr);
        throw new Error(`Failed to fetch disabilities: ${fetchDisErr.message}`);
      }

      // Ensure we have a valid array
      const existingDisabilities = existingDisabilitiesData || [];

      // Calculate diff: what to delete and what to insert
      const existingIds = new Set(
        existingDisabilities.map((d) => d.disability_type_id)
      );
      const newIds = new Set(disabilities.map((d) => d.disability_type_id));

      // Items to delete: in DB but not in form
      const toDelete = existingDisabilities.filter(
        (d) => !newIds.has(d.disability_type_id)
      );

      // Items to insert: in form but not in DB
      const toInsert = disabilities.filter(
        (d) => !existingIds.has(d.disability_type_id)
      );

      console.log('Disability diff analysis:', {
        existing: existingIds.size,
        new: newIds.size,
        toDelete: toDelete.length,
        toInsert: toInsert.length,
      });

      // Delete only items that need to be removed
      if (toDelete.length > 0) {
        const { error: deleteDisErr } = await supabase
          .from('application_disabilities')
          .delete()
          .eq('application_id', applicationId)
          .in(
            'disability_type_id',
            toDelete.map((d) => d.disability_type_id)
          );

        if (deleteDisErr) {
          console.error('Error deleting disabilities:', deleteDisErr);
          throw new Error(
            `Failed to delete disabilities: ${deleteDisErr.message}`
          );
        }

        console.log('Successfully deleted', toDelete.length, 'disabilities');
      }

      // Insert only new items
      if (toInsert.length > 0) {
        const disabilityInserts = toInsert.map((d) => ({
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
            `Failed to insert disabilities: ${insertDisErr.message}`
          );
        }

        console.log('Successfully inserted', toInsert.length, 'disabilities');
      }

      // Handle prior education using diff-based approach to avoid race conditions
      console.log('Prior education array length:', priorEducation.length);

      // Fetch existing prior education from database
      const { data: existingPriorEdData, error: fetchPriorEdErr } =
        await supabase
          .from('application_prior_education')
          .select('prior_achievement_id, recognition_type')
          .eq('application_id', applicationId);

      if (fetchPriorEdErr) {
        console.error(
          'Error fetching existing prior education:',
          fetchPriorEdErr
        );
        throw new Error(
          `Failed to fetch prior education: ${fetchPriorEdErr.message}`
        );
      }

      // Ensure we have a valid array
      const existingPriorEd = existingPriorEdData || [];

      // Create unique keys for comparison (combination of achievement + recognition)
      const makeKey = (
        achievementId: string,
        recognitionType: string | null | undefined
      ) => `${achievementId}|${recognitionType || 'null'}`;

      const existingKeys = new Set(
        existingPriorEd.map((e) =>
          makeKey(e.prior_achievement_id, e.recognition_type)
        )
      );
      const newKeys = new Set(
        priorEducation.map((e) =>
          makeKey(e.prior_achievement_id, e.recognition_type)
        )
      );

      // Items to delete: in DB but not in form
      const toDeletePriorEd = existingPriorEd.filter(
        (e) => !newKeys.has(makeKey(e.prior_achievement_id, e.recognition_type))
      );

      // Items to insert: in form but not in DB
      const toInsertPriorEd = priorEducation.filter(
        (e) =>
          !existingKeys.has(makeKey(e.prior_achievement_id, e.recognition_type))
      );

      console.log('Prior education diff analysis:', {
        existing: existingKeys.size,
        new: newKeys.size,
        toDelete: toDeletePriorEd.length,
        toInsert: toInsertPriorEd.length,
      });

      // Delete only items that need to be removed
      // Note: We need to delete by matching both fields since there's no single unique ID
      for (const item of toDeletePriorEd) {
        const deleteQuery = supabase
          .from('application_prior_education')
          .delete()
          .eq('application_id', applicationId)
          .eq('prior_achievement_id', item.prior_achievement_id);

        // Handle recognition_type which can be null
        const finalQuery = item.recognition_type
          ? deleteQuery.eq('recognition_type', item.recognition_type)
          : deleteQuery.is('recognition_type', null);

        const { error: deletePriorEdErr } = await finalQuery;

        if (deletePriorEdErr) {
          console.error('Error deleting prior education:', deletePriorEdErr);
          throw new Error(
            `Failed to delete prior education: ${deletePriorEdErr.message}`
          );
        }
      }

      if (toDeletePriorEd.length > 0) {
        console.log(
          'Successfully deleted',
          toDeletePriorEd.length,
          'prior education records'
        );
      }

      // Insert only new items
      if (toInsertPriorEd.length > 0) {
        const priorEdInserts = toInsertPriorEd.map((e) => ({
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
            `Failed to insert prior education: ${insertPriorEdErr.message}`
          );
        }

        console.log(
          'Successfully inserted',
          priorEdInserts.length,
          'prior education records'
        );
        console.log('Inserted data:', insertedData);
      } else {
        console.log('No prior education records to insert');
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
