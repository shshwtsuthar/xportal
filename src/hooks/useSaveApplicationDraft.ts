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

        // Helper to clean empty strings to null
        const cleanEmptyString = (
          val: string | null | undefined
        ): string | null => {
          if (val === null || val === undefined || val === '') return null;
          return val;
        };

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
          // Convert empty strings to null for text fields
          salutation: cleanEmptyString(values.salutation),
          first_name: cleanEmptyString(values.first_name),
          middle_name: cleanEmptyString(values.middle_name),
          last_name: cleanEmptyString(values.last_name),
          preferred_name: cleanEmptyString(values.preferred_name),
          gender: cleanEmptyString(values.gender),
          highest_school_level_id: cleanEmptyString(
            values.highest_school_level_id
          ),
          indigenous_status_id: cleanEmptyString(values.indigenous_status_id),
          labour_force_status_id: cleanEmptyString(
            values.labour_force_status_id
          ),
          country_of_birth_id: cleanEmptyString(values.country_of_birth_id),
          language_code: cleanEmptyString(values.language_code),
          citizenship_status_code: cleanEmptyString(
            values.citizenship_status_code
          ),
          at_school_flag: cleanEmptyString(values.at_school_flag),
          work_phone: cleanEmptyString(values.work_phone),
          mobile_phone: cleanEmptyString(values.mobile_phone),
          home_phone: cleanEmptyString(values.home_phone),
          address_line_1: cleanEmptyString(values.address_line_1),
          suburb: cleanEmptyString(values.suburb),
          state: cleanEmptyString(values.state),
          postcode: cleanEmptyString(values.postcode),
          street_building_name: cleanEmptyString(values.street_building_name),
          street_unit_details: cleanEmptyString(values.street_unit_details),
          street_number: cleanEmptyString(values.street_number),
          street_name: cleanEmptyString(values.street_name),
          street_po_box: cleanEmptyString(values.street_po_box),
          street_country: cleanEmptyString(values.street_country),
          postal_building_name: cleanEmptyString(values.postal_building_name),
          postal_unit_details: cleanEmptyString(values.postal_unit_details),
          postal_street_number: cleanEmptyString(values.postal_street_number),
          postal_street_name: cleanEmptyString(values.postal_street_name),
          postal_po_box: cleanEmptyString(values.postal_po_box),
          postal_suburb: cleanEmptyString(values.postal_suburb),
          postal_state: cleanEmptyString(values.postal_state),
          postal_postcode: cleanEmptyString(values.postal_postcode),
          postal_country: cleanEmptyString(values.postal_country),
          year_highest_school_level_completed: cleanEmptyString(
            values.year_highest_school_level_completed
          ),
          survey_contact_status: values.survey_contact_status || 'A',
          vsn: cleanEmptyString(values.vsn),
          usi: cleanEmptyString(values.usi),
          usi_exemption_code: values.usi_exemption_code || undefined,
          passport_number: cleanEmptyString(values.passport_number),
          place_of_birth: cleanEmptyString(values.place_of_birth),
          visa_type: cleanEmptyString(values.visa_type),
          visa_number: cleanEmptyString(values.visa_number),
          visa_application_office: cleanEmptyString(
            values.visa_application_office
          ),
          country_of_citizenship: cleanEmptyString(
            values.country_of_citizenship
          ),
          ielts_score: cleanEmptyString(values.ielts_score),
          english_test_type: cleanEmptyString(values.english_test_type),
          previous_provider_name: cleanEmptyString(
            values.previous_provider_name
          ),
          oshc_provider_name: cleanEmptyString(values.oshc_provider_name),
          ec_name: cleanEmptyString(values.ec_name),
          ec_relationship: cleanEmptyString(values.ec_relationship),
          ec_phone_number: cleanEmptyString(values.ec_phone_number),
          g_name: cleanEmptyString(values.g_name),
          g_email: cleanEmptyString(values.g_email),
          g_phone_number: cleanEmptyString(values.g_phone_number),
          g_relationship: cleanEmptyString(values.g_relationship),
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
          // Clean up null/undefined values for optional flag fields (default to '@' for "not stated")
          disability_flag: values.disability_flag || '@',
          prior_education_flag: values.prior_education_flag || '@',
          email: values.email || null,
          alternative_email: values.alternative_email || null,
          agent_id: values.agent_id === 'none' ? null : values.agent_id || null,
          timetable_id: values.timetable_id || null,
          program_id: values.program_id || null,
          payment_plan_template_id: values.payment_plan_template_id || null,
          group_id: values.group_id || null,
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
        } else {
          // Create new application with form data
          console.log(
            '[useSaveApplicationDraft] Creating new application with data:',
            cleanedValues
          );
          createMutation.mutate(cleanedValues, {
            onSuccess: async (created) => {
              console.log(
                '[useSaveApplicationDraft] Application created successfully:',
                created.id
              );
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
                console.error(
                  '[useSaveApplicationDraft] Related data persistence failed:',
                  error
                );
              }
            },
            onError: (err) => {
              console.error(
                '[useSaveApplicationDraft] Failed to create application:',
                err
              );
              toast.error(
                `Failed to create application: ${err.message || String(err)}`
              );
            },
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
