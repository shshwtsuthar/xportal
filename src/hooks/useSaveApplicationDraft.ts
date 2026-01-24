import { useCallback } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { toast } from 'sonner';
import { useCreateApplication } from './useCreateApplication';
import { useUpdateApplication } from './useUpdateApplication';
import { usePersistLearningPlan } from './usePersistLearningPlan';
import { usePersistPaymentSchedule } from './usePersistPaymentSchedule';
import { usePersistApplicationArrays } from './usePersistApplicationArrays';
import type { ApplicationFormValues } from '@/src/lib/applicationSchema';
import type { Tables } from '@/database.types';

type SaveDraftOptions = {
  form: UseFormReturn<Partial<ApplicationFormValues>>;
  currentApplication: Tables<'applications'> | undefined;
  createMutation: ReturnType<typeof useCreateApplication>;
  isReadOnly: boolean;
  checkReadiness: () => void;
};

/**
 * Orchestration hook that combines all application persistence operations.
 * Handles application update/create + learning plan + payment schedule + arrays.
 */
export const useSaveApplicationDraft = () => {
  const updateMutation = useUpdateApplication();
  const persistLearningPlan = usePersistLearningPlan();
  const persistPaymentSchedule = usePersistPaymentSchedule();
  const persistArrays = usePersistApplicationArrays();

  const saveDraft = useCallback(
    async ({
      form,
      currentApplication,
      createMutation,
      isReadOnly,
      checkReadiness,
    }: SaveDraftOptions) => {
      if (isReadOnly) {
        toast.error(
          'Cannot save: Application has been submitted and is read-only.'
        );
        return;
      }

      try {
        const values = form.getValues();

        // Helper function to convert Date objects to ISO strings
        const convertDateToString = (
          date: string | Date | null | undefined
        ): string | null => {
          if (!date) return null;
          if (typeof date === 'string') return date;
          if (date instanceof Date) return date.toISOString().split('T')[0];
          return null;
        };

        // Clean up empty strings for date fields to prevent PostgreSQL errors
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { disabilities, prior_education, ...valuesWithoutArrays } =
          values;

        // For updates, exclude preferred_location_id if it's null/empty
        const { preferred_location_id, ...valuesWithoutLocation } =
          valuesWithoutArrays;
        const cleanedPreferredLocationId =
          preferred_location_id && preferred_location_id.trim() !== ''
            ? preferred_location_id
            : undefined;

        const cleanedValues = {
          ...valuesWithoutLocation,
          ...(cleanedPreferredLocationId !== undefined && {
            preferred_location_id: cleanedPreferredLocationId,
          }),
          date_of_birth: values.date_of_birth
            ? typeof values.date_of_birth === 'string'
              ? values.date_of_birth
              : values.date_of_birth.toISOString()
            : null,
          proposed_commencement_date: convertDateToString(
            values.proposed_commencement_date
          ),
          payment_anchor_date: convertDateToString(values.payment_anchor_date),
          // CRICOS date fields
          passport_issue_date: convertDateToString(values.passport_issue_date),
          passport_expiry_date: convertDateToString(
            values.passport_expiry_date
          ),
          welfare_start_date: convertDateToString(values.welfare_start_date),
          oshc_start_date: convertDateToString(values.oshc_start_date),
          oshc_end_date: convertDateToString(values.oshc_end_date),
          english_test_date: convertDateToString(values.english_test_date),
          // Clean up null values for optional flag fields
          disability_flag:
            values.disability_flag === null
              ? undefined
              : values.disability_flag,
          prior_education_flag:
            values.prior_education_flag === null
              ? undefined
              : values.prior_education_flag,
          email: values.email || null,
          alternative_email: values.alternative_email || null,
          g_email: values.g_email || null,
          agent_id: values.agent_id === 'none' ? null : values.agent_id || null,
          timetable_id: values.timetable_id || null,
          program_id: values.program_id || null,
          payment_plan_template_id: values.payment_plan_template_id || null,
        };

        // Helper to persist all related data after application save
        const persistRelatedData = async (applicationId: string) => {
          await persistLearningPlan.mutateAsync({
            applicationId,
            timetableId: cleanedValues.timetable_id,
            proposedCommencementDate: cleanedValues.proposed_commencement_date,
          });

          await persistPaymentSchedule.mutateAsync({
            applicationId,
            paymentPlanTemplateId: cleanedValues.payment_plan_template_id,
            paymentAnchorDate: cleanedValues.payment_anchor_date,
          });

          await persistArrays.mutateAsync({
            applicationId,
            disabilities: values.disabilities || [],
            priorEducation: values.prior_education || [],
          });

          checkReadiness();
        };

        // If we have an application ID, update it
        if (currentApplication?.id) {
          updateMutation.mutate(
            { id: currentApplication.id, ...cleanedValues },
            {
              onSuccess: async () => {
                try {
                  await persistRelatedData(currentApplication.id);
                  toast.success('Draft saved');
                } catch (error) {
                  // Related data failed - success toast already shown by mutation's onError
                  console.error('Related data persistence failed:', error);
                }
              },
              onError: (error) =>
                toast.error(`Failed to save draft: ${error.message}`),
            }
          );
        } else if (createMutation.isPending) {
          // If creation is already in progress, wait for it to complete
          toast.info('Creating application, please wait...');
        } else if (createMutation.isSuccess && createMutation.data?.id) {
          // If creation was successful but application state hasn't updated yet
          updateMutation.mutate(
            { id: createMutation.data.id, ...cleanedValues },
            {
              onSuccess: async () => {
                try {
                  await persistRelatedData(createMutation.data.id);
                  toast.success('Draft saved');
                } catch (error) {
                  console.error('Related data persistence failed:', error);
                }
              },
              onError: (error) =>
                toast.error(`Failed to save draft: ${error.message}`),
            }
          );
        } else {
          // Create new application with form data
          createMutation.mutate(cleanedValues, {
            onSuccess: async (created) => {
              // Redirect to edit page
              window.history.replaceState(
                null,
                '',
                `/applications/edit/${created.id}`
              );
              try {
                await persistRelatedData(created.id);
                toast.success('Draft saved');
              } catch (error) {
                console.error('Related data persistence failed:', error);
              }
            },
            onError: (err) =>
              toast.error(`Failed to create application: ${err.message}`),
          });
        }
      } catch (error) {
        console.error('Save draft error:', error);
        toast.error('Failed to save draft');
      }
    },
    [updateMutation, persistLearningPlan, persistPaymentSchedule, persistArrays]
  );

  return {
    saveDraft,
    isPending:
      updateMutation.isPending ||
      persistLearningPlan.isPending ||
      persistPaymentSchedule.isPending ||
      persistArrays.isPending,
    isSuccess: updateMutation.isSuccess,
    error:
      updateMutation.error ||
      persistLearningPlan.error ||
      persistPaymentSchedule.error ||
      persistArrays.error,
  };
};
