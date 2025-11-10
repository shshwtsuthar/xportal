'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form } from '@/components/ui/form';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MagneticButton } from '@/components/ui/magnetic-button';
import {
  applicationSchema,
  draftApplicationSchema,
  type ApplicationFormValues,
} from '@/lib/validators/application';
import { useCreateApplication } from '@/src/hooks/useCreateApplication';
import { useGetApplication } from '@/src/hooks/useGetApplication';
import { useUpdateApplication } from '@/src/hooks/useUpdateApplication';
import { Step1_PersonalDetails } from './steps/Step1_PersonalDetails';
import { Step2_AvetmissDetails } from './steps/Step2_AvetmissDetails';
import { Step3_AdditionalInfo } from './steps/Step3_AdditionalInfo';
import { Step3_Cricos } from './steps/Step3_Cricos';
import { EnrollmentStep } from './steps/Step4_Enrollment';
import { DocumentsPane } from './DocumentsPane';
import { PaymentStep } from './PaymentStep';
import { useUploadApplicationFile } from '@/src/hooks/useApplicationFiles';
import { toast } from 'sonner';
import { useSubmitApplication } from '@/src/hooks/useSubmitApplication';
import { createClient } from '@/lib/supabase/client';
import { Kbd, KbdGroup } from '@/components/ui/kbd';

type Props = { applicationId?: string };

const steps = [
  { id: 1, label: 'Personal Details' },
  { id: 2, label: 'AVETMISS' },
  { id: 3, label: 'CRICOS' },
  { id: 4, label: 'Additional Info' },
  { id: 5, label: 'Enrollment' },
  { id: 6, label: 'Payment' },
  { id: 7, label: 'Documents' },
];

export function NewApplicationWizard({ applicationId }: Props) {
  const [activeStep, setActiveStep] = useState(0);
  const createMutation = useCreateApplication();
  const { data: application, isLoading } = useGetApplication(applicationId);

  // Use created application data if we just created one
  const currentApplication = application || createMutation.data;

  // Only read-only if status exists and is not DRAFT (treat null/undefined as DRAFT)
  const isReadOnly = currentApplication?.status
    ? currentApplication.status !== 'DRAFT'
    : false;

  const updateMutation = useUpdateApplication();
  const submitMutation = useSubmitApplication();
  const uploadFileMutation = useUploadApplicationFile();

  const form = useForm({
    resolver: zodResolver(draftApplicationSchema), // Use draft schema for form validation
    defaultValues: {
      salutation: '',
      first_name: '',
      middle_name: '',
      last_name: '',
      preferred_name: '',
      date_of_birth: '',
      program_id: '',
      timetable_id: '',
      proposed_commencement_date: '',
      payment_plan_template_id: '',
      payment_anchor_date: '',
      agent_id: 'none',
      email: '',
      work_phone: '',
      mobile_phone: '',
      alternative_email: '',
      address_line_1: '',
      suburb: '',
      state: '',
      postcode: '',
      street_building_name: '',
      street_unit_details: '',
      street_number_name: '',
      street_po_box: '',
      street_country: 'AU',
      postal_is_same_as_street: true,
      postal_building_name: '',
      postal_unit_details: '',
      postal_number_name: '',
      postal_po_box: '',
      postal_suburb: '',
      postal_state: '',
      postal_postcode: '',
      postal_country: 'AU',
      gender: '',
      highest_school_level_id: '',
      indigenous_status_id: '',
      labour_force_status_id: '',
      country_of_birth_id: 'AU',
      language_code: '',
      citizenship_status_code: '',
      at_school_flag: '',
      disability_flag: undefined,
      prior_education_flag: undefined,
      disabilities: [],
      prior_education: [],
      year_highest_school_level_completed: '',
      survey_contact_status: 'A',
      vsn: '',
      is_international: false,
      usi: '',
      passport_number: '',
      visa_type: '',
      visa_number: '',
      country_of_citizenship: 'AU',
      ielts_score: '',
      ec_name: '',
      ec_relationship: '',
      ec_phone_number: '',
      g_name: '',
      g_email: '',
      g_phone_number: '',
      g_relationship: '',
    },
  });

  useEffect(() => {
    if (currentApplication) {
      const toReset: Partial<ApplicationFormValues> = {
        salutation: currentApplication.salutation ?? '',
        first_name: currentApplication.first_name ?? '',
        middle_name: currentApplication.middle_name ?? '',
        last_name: currentApplication.last_name ?? '',
        preferred_name: currentApplication.preferred_name ?? '',
        date_of_birth: currentApplication.date_of_birth ?? '',
        program_id: currentApplication.program_id ?? '',
        timetable_id: currentApplication.timetable_id ?? '',
        proposed_commencement_date:
          currentApplication.proposed_commencement_date ?? '',
        payment_plan_template_id:
          currentApplication.payment_plan_template_id ?? '',
        payment_anchor_date: currentApplication.payment_anchor_date ?? '',
        agent_id: currentApplication.agent_id
          ? currentApplication.agent_id
          : 'none',
        email: currentApplication.email ?? '',
        work_phone: currentApplication.work_phone ?? '',
        mobile_phone: currentApplication.mobile_phone ?? '',
        alternative_email: currentApplication.alternative_email ?? '',
        address_line_1: currentApplication.address_line_1 ?? '',
        suburb: currentApplication.suburb ?? '',
        state: currentApplication.state ?? '',
        postcode: currentApplication.postcode ?? '',
        street_building_name: currentApplication.street_building_name ?? '',
        street_unit_details: currentApplication.street_unit_details ?? '',
        street_number_name: currentApplication.street_number_name ?? '',
        street_po_box: currentApplication.street_po_box ?? '',
        street_country: currentApplication.street_country ?? 'AU',
        postal_is_same_as_street: Boolean(
          currentApplication.postal_is_same_as_street
        ),
        postal_building_name: currentApplication.postal_building_name ?? '',
        postal_unit_details: currentApplication.postal_unit_details ?? '',
        postal_number_name: currentApplication.postal_number_name ?? '',
        postal_po_box: currentApplication.postal_po_box ?? '',
        postal_suburb: currentApplication.postal_suburb ?? '',
        postal_state: currentApplication.postal_state ?? '',
        postal_postcode: currentApplication.postal_postcode ?? '',
        postal_country: currentApplication.postal_country ?? 'AU',
        gender: currentApplication.gender ?? '',
        highest_school_level_id:
          currentApplication.highest_school_level_id ?? '',
        indigenous_status_id: currentApplication.indigenous_status_id ?? '',
        labour_force_status_id: currentApplication.labour_force_status_id ?? '',
        country_of_birth_id: currentApplication.country_of_birth_id ?? 'AU',
        language_code: currentApplication.language_code ?? '',
        citizenship_status_code:
          currentApplication.citizenship_status_code ?? '',
        at_school_flag: currentApplication.at_school_flag ?? '',
        disability_flag:
          currentApplication.disability_flag === null ||
          currentApplication.disability_flag === undefined
            ? undefined
            : (currentApplication.disability_flag as 'Y' | 'N'),
        prior_education_flag:
          currentApplication.prior_education_flag === null ||
          currentApplication.prior_education_flag === undefined
            ? undefined
            : (currentApplication.prior_education_flag as 'Y' | 'N'),
        disabilities: [], // Will be loaded by Step3_AdditionalInfo component
        prior_education: [], // Will be loaded by Step3_AdditionalInfo component
        year_highest_school_level_completed:
          currentApplication.year_highest_school_level_completed ?? '',
        survey_contact_status: (currentApplication.survey_contact_status &&
        ['A', 'C', 'D', 'E', 'I', 'M', 'O'].includes(
          currentApplication.survey_contact_status
        )
          ? currentApplication.survey_contact_status
          : 'A') as 'A' | 'C' | 'D' | 'E' | 'I' | 'M' | 'O',
        vsn: currentApplication.vsn ?? '',
        is_international: Boolean(currentApplication.is_international),
        usi: currentApplication.usi ?? '',
        passport_number: currentApplication.passport_number ?? '',
        visa_type: currentApplication.visa_type ?? '',
        visa_number: currentApplication.visa_number ?? '',
        country_of_citizenship:
          currentApplication.country_of_citizenship ?? 'AU',
        ielts_score: currentApplication.ielts_score ?? '',
        ec_name: currentApplication.ec_name ?? '',
        ec_relationship: currentApplication.ec_relationship ?? '',
        ec_phone_number: currentApplication.ec_phone_number ?? '',
        g_name: currentApplication.g_name ?? '',
        g_email: currentApplication.g_email ?? '',
        g_phone_number: currentApplication.g_phone_number ?? '',
        g_relationship: currentApplication.g_relationship ?? '',
      };
      form.reset(toReset);
    }
  }, [currentApplication, form]);

  useEffect(() => {
    // Only auto-create if we're on /new route and no application exists yet
    // This prevents conflicts with manual save draft operations
    if (
      !applicationId &&
      !isLoading &&
      !currentApplication &&
      !createMutation.isPending &&
      !createMutation.isSuccess
    ) {
      // Don't auto-create - let the user manually save to create
      // createMutation.mutate(undefined, {
      //   onSuccess: (created) => {
      //     window.history.replaceState(null, '', `/applications/edit/${created.id}`);
      //     toast.success('Draft application created');
      //   },
      //   onError: (err) => toast.error(String(err)),
      // });
    }
  }, [applicationId, isLoading, currentApplication, createMutation]);

  const handleSaveDraft = useCallback(async () => {
    if (isReadOnly) {
      toast.error(
        'Cannot save: Application has been submitted and is read-only.'
      );
      return;
    }
    try {
      const values = form.getValues();

      // Debug: Log form values, especially the new flag fields
      console.log('=== DRAFT SAVE DEBUG ===');
      console.log('Form values:', values);
      console.log(
        'disability_flag:',
        values.disability_flag,
        'Type:',
        typeof values.disability_flag
      );
      console.log(
        'prior_education_flag:',
        values.prior_education_flag,
        'Type:',
        typeof values.prior_education_flag
      );
      console.log(
        'disabilities array:',
        values.disabilities,
        'Length:',
        values.disabilities?.length || 0
      );
      console.log(
        'prior_education array:',
        values.prior_education,
        'Length:',
        values.prior_education?.length || 0
      );
      console.log(
        'prior_education array details:',
        JSON.stringify(values.prior_education, null, 2)
      );

      // Clean null values from flag fields before validation
      // Schema expects 'Y', 'N', '', or undefined (not null)
      const valuesForValidation = {
        ...values,
        disability_flag:
          values.disability_flag === null ? undefined : values.disability_flag,
        prior_education_flag:
          values.prior_education_flag === null
            ? undefined
            : values.prior_education_flag,
      };

      // Validate format only (using draft schema) before saving
      const validationResult =
        draftApplicationSchema.safeParse(valuesForValidation);

      if (!validationResult.success) {
        console.log('=== VALIDATION ERRORS ===');
        console.log('Total errors:', validationResult.error.issues.length);
        console.log(
          'All validation errors:',
          JSON.stringify(validationResult.error.issues, null, 2)
        );
        validationResult.error.issues.forEach((issue, index) => {
          const fieldValue =
            issue.path.length > 0
              ? (values as Record<string, unknown>)[issue.path[0] as string]
              : 'N/A';
          console.log(`Error ${index + 1}:`, {
            path: issue.path,
            message: issue.message,
            code: issue.code,
            value: fieldValue,
          });
        });
        // Set form errors for display
        validationResult.error.issues.forEach((issue) => {
          const fieldName = issue.path.join('.') as string;
          form.setError(fieldName as never, {
            message: issue.message,
          });
        });
        toast.error('Please fix format errors before saving draft.');
        return;
      }

      // Helper function to convert Date objects to ISO strings
      const convertDateToString = (
        date: string | Date | null | undefined
      ): string | null => {
        if (!date) return null;
        if (typeof date === 'string') return date;
        if (date instanceof Date) return date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
        return null;
      };

      // Clean up empty strings for date fields to prevent PostgreSQL errors
      // Note: disabilities and prior_education arrays are NOT part of applications table
      // They are stored separately in junction tables via afterPersistDisabilitiesAndPriorEducation
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { disabilities, prior_education, ...valuesWithoutArrays } = values;

      const cleanedValues = {
        ...valuesWithoutArrays,
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
        passport_expiry_date: convertDateToString(values.passport_expiry_date),
        welfare_start_date: convertDateToString(values.welfare_start_date),
        oshc_start_date: convertDateToString(values.oshc_start_date),
        oshc_end_date: convertDateToString(values.oshc_end_date),
        english_test_date: convertDateToString(values.english_test_date),
        written_agreement_date: convertDateToString(
          values.written_agreement_date
        ),
        // Clean up null values for optional flag fields
        // Schema expects 'Y', 'N', '', or undefined (not null)
        disability_flag:
          values.disability_flag === null ? undefined : values.disability_flag,
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

      const afterPersistLearningPlan = async (applicationId: string) => {
        try {
          // Persist draft learning plan only if both drivers exist
          if (
            cleanedValues.timetable_id &&
            cleanedValues.proposed_commencement_date
          ) {
            const supabase = createClient();
            const { error } = await supabase.rpc(
              'upsert_application_learning_plan_draft',
              { app_id: applicationId }
            );
            if (error) {
              console.error('Draft plan RPC error:', error.message);
              toast.error('Saved draft, but failed to persist learning plan');
              return;
            }
            toast.success('Draft saved and learning plan updated');
          } else {
            toast.success('Draft saved');
          }
        } catch (e) {
          console.error('Draft learning plan error:', e);
          toast.error('Saved draft, but failed to persist learning plan');
        }
      };

      const afterPersistPaymentSchedule = async (applicationId: string) => {
        try {
          // Persist draft payment schedule only when template AND anchor date exist
          if (
            cleanedValues.payment_plan_template_id &&
            cleanedValues.payment_anchor_date
          ) {
            const supabase = createClient();
            const { error } = await supabase.rpc(
              'upsert_application_payment_schedule_draft',
              { app_id: applicationId }
            );
            if (error) {
              console.error('Draft payment schedule RPC error:', error.message);
              toast.error(
                'Saved draft, but failed to persist payment schedule'
              );
              return;
            }
          } else if (
            cleanedValues.payment_plan_template_id &&
            !cleanedValues.payment_anchor_date
          ) {
            // Soft guidance: no RPC call without anchor date
            // Keep silent success for draft save; preview will prompt for date
          }
        } catch (e) {
          console.error('Draft payment schedule error:', e);
          toast.error('Saved draft, but failed to persist payment schedule');
        }
      };

      const afterPersistDisabilitiesAndPriorEducation = async (
        applicationId: string
      ) => {
        try {
          const supabase = createClient();

          // Get the RTO ID from the user's session
          const { data: sessionData } = await supabase.auth.getSession();
          const rtoId = (
            sessionData.session?.user?.app_metadata as Record<string, unknown>
          )?.rto_id as string;
          if (!rtoId) {
            console.error('User RTO not found in session metadata.');
            toast.error('Failed to save: User RTO not found.');
            return;
          }

          // Handle disabilities
          const formDisabilities = values.disabilities || [];
          console.log('=== PERSISTING DISABILITIES & PRIOR EDUCATION ===');
          console.log('Application ID:', applicationId);
          console.log('RTO ID:', rtoId);
          console.log('Form disabilities:', formDisabilities);

          // Delete all existing disabilities for this application
          const { error: deleteDisErr } = await supabase
            .from('application_disabilities')
            .delete()
            .eq('application_id', applicationId);

          if (deleteDisErr) {
            console.error(
              'Error deleting existing disabilities:',
              deleteDisErr
            );
            toast.error(`Failed to save disabilities: ${deleteDisErr.message}`);
            return;
          }

          // Insert new disabilities from form state
          if (formDisabilities.length > 0) {
            const disabilityInserts = formDisabilities.map((d) => ({
              application_id: applicationId,
              rto_id: rtoId,
              disability_type_id: d.disability_type_id,
            }));

            const { error: insertDisErr } = await supabase
              .from('application_disabilities')
              .insert(disabilityInserts);

            if (insertDisErr) {
              console.error('Error inserting disabilities:', insertDisErr);
              toast.error(
                `Failed to save disabilities: ${insertDisErr.message}`
              );
            } else {
              console.log(
                'Successfully inserted',
                disabilityInserts.length,
                'disabilities'
              );
            }
          }

          // Handle prior education
          const formPriorEducation = values.prior_education || [];
          console.log('Form prior education:', formPriorEducation);
          console.log(
            'Prior education array length:',
            formPriorEducation.length
          );

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
            toast.error(
              `Failed to save prior education: ${deletePriorEdErr.message}`
            );
            return;
          }

          // Insert new prior education from form state
          if (formPriorEducation.length > 0) {
            const priorEdInserts = formPriorEducation.map((e) => ({
              application_id: applicationId,
              rto_id: rtoId,
              prior_achievement_id: e.prior_achievement_id,
              recognition_type: e.recognition_type || null,
            }));

            console.log('Prior education inserts to be saved:', priorEdInserts);

            const { error: insertPriorEdErr, data: insertedData } =
              await supabase
                .from('application_prior_education')
                .insert(priorEdInserts)
                .select();

            if (insertPriorEdErr) {
              console.error(
                'Error inserting prior education:',
                insertPriorEdErr
              );
              console.error(
                'Error details:',
                JSON.stringify(insertPriorEdErr, null, 2)
              );
              toast.error(
                `Failed to save prior education: ${insertPriorEdErr.message}`
              );
            } else {
              console.log(
                'Successfully inserted',
                priorEdInserts.length,
                'prior education records'
              );
              console.log('Inserted data:', insertedData);
            }
          } else {
            console.log(
              'No prior education records to insert (array is empty)'
            );
          }
        } catch (e) {
          console.error(
            'Error persisting disabilities and prior education:',
            e
          );
          toast.error(
            `Failed to save additional info: ${e instanceof Error ? e.message : String(e)}`
          );
        }
      };

      // If we have an application ID, update it
      if (currentApplication?.id) {
        updateMutation.mutate(
          { id: currentApplication.id, ...cleanedValues },
          {
            onSuccess: async () => {
              await afterPersistLearningPlan(currentApplication.id);
              await afterPersistPaymentSchedule(currentApplication.id);
              await afterPersistDisabilitiesAndPriorEducation(
                currentApplication.id
              );
            },
            onError: (error) =>
              toast.error(`Failed to save draft: ${error.message}`),
          }
        );
      } else if (createMutation.isPending) {
        // If creation is already in progress, wait for it to complete
        toast.info('Creating application, please wait...');
      } else if (createMutation.isSuccess && createMutation.data?.id) {
        // If creation was successful but application state hasn't updated yet, use the created data
        updateMutation.mutate(
          { id: createMutation.data.id, ...cleanedValues },
          {
            onSuccess: async () => {
              await afterPersistLearningPlan(createMutation.data.id);
              await afterPersistPaymentSchedule(createMutation.data.id);
              await afterPersistDisabilitiesAndPriorEducation(
                createMutation.data.id
              );
            },
            onError: (error) =>
              toast.error(`Failed to save draft: ${error.message}`),
          }
        );
      } else {
        // Only create if we're not already pending and haven't succeeded
        // Pass the form data directly to create the application with the filled-in values
        createMutation.mutate(cleanedValues, {
          onSuccess: async (created) => {
            // Redirect to edit page
            window.history.replaceState(
              null,
              '',
              `/applications/edit/${created.id}`
            );
            await afterPersistLearningPlan(created.id);
            await afterPersistPaymentSchedule(created.id);
            await afterPersistDisabilitiesAndPriorEducation(created.id);
          },
          onError: (err) =>
            toast.error(`Failed to create application: ${err.message}`),
        });
      }
    } catch (error) {
      console.error('Save draft error:', error);
      toast.error('Failed to save draft');
    }
  }, [isReadOnly, form, updateMutation, createMutation, currentApplication]);

  // Store the latest handleSaveDraft in a ref to avoid re-registering the event listener
  const handleSaveDraftRef = useRef(handleSaveDraft);
  useEffect(() => {
    handleSaveDraftRef.current = handleSaveDraft;
  }, [handleSaveDraft]);

  // Keyboard shortcut: Ctrl+S / Cmd+S to save draft
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Ctrl+S (Windows/Linux) or Cmd+S (Mac)
      if (
        (event.ctrlKey || event.metaKey) &&
        event.key === 's' &&
        !event.shiftKey &&
        !event.altKey
      ) {
        // Only trigger if button is not disabled
        const isDisabled =
          createMutation.isPending || updateMutation.isPending || isReadOnly;

        if (!isDisabled) {
          event.preventDefault();
          handleSaveDraftRef.current();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [createMutation.isPending, updateMutation.isPending, isReadOnly]);

  const goStep = async (next: number) => {
    await handleSaveDraft();
    setActiveStep(next);
  };

  const handleSubmitApplication = async () => {
    try {
      console.log('Submit button clicked');
      console.log('Application:', currentApplication);
      console.log('Application ID:', currentApplication?.id);

      // First validate the form using the full submission schema
      const formValues = form.getValues();
      const validationResult = applicationSchema.safeParse(formValues);

      if (!validationResult.success) {
        console.log('Form validation failed:', validationResult.error.issues);
        // Set form errors for display
        validationResult.error.issues.forEach((issue) => {
          const fieldName = issue.path.join('.') as string;
          form.setError(fieldName as never, {
            message: issue.message,
          });
        });
        toast.error('Please fix validation errors before submitting.');
        return;
      }

      console.log('Form validation passed');

      // Check if we have an application to submit
      if (!currentApplication?.id) {
        toast.error('No application found. Please save your draft first.');
        return;
      }

      console.log(
        'Calling submit mutation with applicationId:',
        currentApplication.id
      );

      // Submit the application
      submitMutation.mutate(
        { applicationId: currentApplication.id },
        {
          onSuccess: (data) => {
            console.log('Submit success:', data);
            toast.success('Application submitted successfully');
            // Redirect to applications page after successful submission
            window.location.href = '/applications';
          },
          onError: (e) => {
            console.error('Submit error:', e);
            toast.error(`Failed to submit application: ${String(e)}`);
          },
        }
      );
    } catch (error) {
      console.error('Submit application error:', error);
      toast.error('Failed to submit application');
    }
  };

  // Watch all required fields to determine if form is ready for submission
  const watchedFields = useWatch({
    control: form.control,
    name: [
      'first_name',
      'last_name',
      'date_of_birth',
      'program_id',
      'timetable_id',
      'proposed_commencement_date',
      'suburb',
      'state',
      'postcode',
      'gender',
      'highest_school_level_id',
      'year_highest_school_level_completed',
      'indigenous_status_id',
      'labour_force_status_id',
      'country_of_birth_id',
      'language_code',
      'citizenship_status_code',
      'at_school_flag',
      'is_international',
      'usi',
      'vsn',
      // CRICOS fields
      'written_agreement_accepted',
      'written_agreement_date',
      'privacy_notice_accepted',
      'passport_number',
      'street_country',
      'is_under_18',
      'provider_accepting_welfare_responsibility',
      'welfare_start_date',
      'provider_arranged_oshc',
      'oshc_provider_name',
      'oshc_start_date',
      'oshc_end_date',
      'has_english_test',
      'english_test_type',
      'ielts_score',
      'has_previous_study_australia',
      'previous_provider_name',
      'completed_previous_course',
      'has_release_letter',
    ],
  });

  // Check if all required fields are filled
  const isFormReadyForSubmission = useMemo(() => {
    const [
      first_name,
      last_name,
      date_of_birth,
      program_id,
      timetable_id,
      proposed_commencement_date,
      suburb,
      state,
      postcode,
      gender,
      highest_school_level_id,
      year_highest_school_level_completed,
      indigenous_status_id,
      labour_force_status_id,
      country_of_birth_id,
      language_code,
      citizenship_status_code,
      at_school_flag,
      is_international,
      usi,
      vsn,
      // CRICOS fields
      written_agreement_accepted,
      written_agreement_date,
      privacy_notice_accepted,
      passport_number,
      street_country,
      is_under_18,
      provider_accepting_welfare_responsibility,
      welfare_start_date,
      provider_arranged_oshc,
      oshc_provider_name,
      oshc_start_date,
      oshc_end_date,
      has_english_test,
      english_test_type,
      ielts_score,
      has_previous_study_australia,
      previous_provider_name,
      completed_previous_course,
      has_release_letter,
    ] = watchedFields;

    // Basic required fields
    if (
      !first_name ||
      !last_name ||
      !date_of_birth ||
      !program_id ||
      !timetable_id ||
      !proposed_commencement_date ||
      !suburb ||
      !state ||
      !postcode ||
      !gender ||
      !highest_school_level_id ||
      !indigenous_status_id ||
      !labour_force_status_id ||
      !country_of_birth_id ||
      !language_code ||
      !citizenship_status_code ||
      !at_school_flag
    ) {
      return false;
    }

    // Conditional: Year highest school level completed (required if not "Did not go to school")
    if (
      highest_school_level_id &&
      highest_school_level_id !== '02' &&
      !year_highest_school_level_completed
    ) {
      return false;
    }

    // Conditional: USI (required for domestic students)
    if (is_international === false && (!usi || usi.trim().length === 0)) {
      return false;
    }

    // Conditional: VSN (required if shown - state === 'VIC' && age < 25 && is_international === false)
    // Calculate age from date_of_birth
    if (date_of_birth && state === 'VIC' && is_international === false) {
      try {
        const dob =
          typeof date_of_birth === 'string'
            ? new Date(date_of_birth)
            : date_of_birth;
        if (!isNaN(dob.getTime())) {
          const today = new Date();
          let age = today.getFullYear() - dob.getFullYear();
          const monthDiff = today.getMonth() - dob.getMonth();
          const dayDiff = today.getDate() - dob.getDate();
          if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
            age--;
          }
          if (age < 25 && (!vsn || vsn.trim().length === 0)) {
            return false;
          }
        }
      } catch {
        // If age calculation fails, don't block submission
      }
    }

    // CRICOS: Required fields for international students
    if (is_international === true) {
      // Written agreement and privacy notice are always required
      if (
        written_agreement_accepted !== true ||
        !written_agreement_date ||
        privacy_notice_accepted !== true
      ) {
        return false;
      }

      // Passport number required if student in Australia
      if (street_country === 'AU' || state) {
        if (!passport_number || passport_number.trim().length === 0) {
          return false;
        }
      }

      // Under 18 fields required if is_under_18 is true
      if (is_under_18 === true) {
        if (provider_accepting_welfare_responsibility === undefined) {
          return false;
        }
        // Welfare start date required if provider accepting responsibility
        if (
          provider_accepting_welfare_responsibility === true &&
          !welfare_start_date
        ) {
          return false;
        }
      }

      // OSHC fields required if provider_arranged_oshc is true
      if (provider_arranged_oshc === true) {
        if (!oshc_provider_name || !oshc_start_date || !oshc_end_date) {
          return false;
        }
      }

      // English test fields required if has_english_test is true
      if (has_english_test === true) {
        if (!english_test_type || !ielts_score) {
          return false;
        }
      }

      // Previous study fields required if has_previous_study_australia is true
      if (has_previous_study_australia === true) {
        if (
          !previous_provider_name ||
          completed_previous_course === undefined ||
          has_release_letter === undefined
        ) {
          return false;
        }
      }
    }

    return true;
  }, [watchedFields]);

  const StepContent = useMemo(() => {
    if (activeStep === 0) return <Step1_PersonalDetails />;
    if (activeStep === 1) return <Step2_AvetmissDetails />;
    if (activeStep === 2) return <Step3_Cricos />;
    if (activeStep === 3)
      return <Step3_AdditionalInfo application={currentApplication} />;
    if (activeStep === 4) return <EnrollmentStep form={form} />;
    if (activeStep === 5 && !!currentApplication)
      return <PaymentStep application={currentApplication} form={form} />;
    if (activeStep === 6)
      return <DocumentsPane applicationId={currentApplication?.id} />;
    return null;
  }, [activeStep, currentApplication, form]);

  // Detect if running on Mac for displaying correct modifier key
  const isMac = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return (
      /Mac|iPhone|iPod|iPad/i.test(navigator.platform) ||
      /Mac|iPhone|iPod|iPad/i.test(navigator.userAgent)
    );
  }, []);

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            New Application
          </h1>
          <p className="text-muted-foreground text-sm">
            Complete all steps to submit a compliant application
          </p>
        </div>
        <div className="flex gap-2">
          {!isFormReadyForSubmission ? (
            <MagneticButton
              variant="outline"
              onClick={handleSaveDraft}
              disabled={
                createMutation.isPending ||
                updateMutation.isPending ||
                isReadOnly
              }
            >
              Save Draft{' '}
              <KbdGroup className="ml-2">
                <Kbd>{isMac ? '⌘' : 'Ctrl'}</Kbd>
                <Kbd>S</Kbd>
              </KbdGroup>
            </MagneticButton>
          ) : (
            <Button
              variant="outline"
              onClick={handleSaveDraft}
              disabled={
                createMutation.isPending ||
                updateMutation.isPending ||
                isReadOnly
              }
            >
              Save Draft{' '}
              <KbdGroup className="ml-2">
                <Kbd>{isMac ? '⌘' : 'Ctrl'}</Kbd>
                <Kbd>S</Kbd>
              </KbdGroup>
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold tracking-tight">
            <div className="flex items-center gap-2">
              {steps.map((s, i) => (
                <Button
                  key={s.id}
                  size="sm"
                  variant={i === activeStep ? 'default' : 'outline'}
                  onClick={() => goStep(i)}
                  aria-label={`Go to ${s.label}`}
                >
                  {s.label}
                </Button>
              ))}
            </div>
          </CardTitle>
        </CardHeader>
        <Form {...form}>
          <CardContent>
            <div className={isReadOnly ? 'pointer-events-none opacity-60' : ''}>
              {StepContent}
            </div>
          </CardContent>
          <CardFooter className="flex items-center justify-between">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => goStep(Math.max(0, activeStep - 1))}
                disabled={isReadOnly}
                aria-label="Previous step"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  goStep(Math.min(steps.length - 1, activeStep + 1))
                }
                disabled={isReadOnly}
                aria-label="Next step"
              >
                Next
              </Button>
            </div>
            <div className="flex gap-2">
              {/* Inline uploader */}
              <label className="relative inline-flex">
                <input
                  type="file"
                  className="hidden"
                  aria-label="Upload file"
                  onChange={async (e) => {
                    try {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (!currentApplication?.id) {
                        toast.error('Save draft to enable uploads.');
                        return;
                      }
                      if (file.size > 10 * 1024 * 1024) {
                        toast.error('File too large (max 10MB).');
                        return;
                      }
                      await uploadFileMutation.mutateAsync({
                        applicationId: currentApplication.id,
                        file,
                      });
                      toast.success('File uploaded');
                      e.currentTarget.value = '';
                    } catch (err) {
                      toast.error(
                        `Upload failed: ${String((err as Error).message || err)}`
                      );
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={(e) => {
                    const input = e.currentTarget
                      .previousSibling as HTMLInputElement | null;
                    input?.click();
                  }}
                  disabled={!currentApplication?.id || isReadOnly}
                >
                  Upload file
                </Button>
              </label>
              {!isFormReadyForSubmission ? (
                <MagneticButton
                  type="button"
                  variant="outline"
                  onClick={handleSaveDraft}
                  disabled={
                    createMutation.isPending ||
                    updateMutation.isPending ||
                    isReadOnly
                  }
                >
                  Save Draft{' '}
                  <KbdGroup className="ml-2">
                    <Kbd>{isMac ? '⌘' : 'Ctrl'}</Kbd>
                    <Kbd>S</Kbd>
                  </KbdGroup>
                </MagneticButton>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSaveDraft}
                  disabled={
                    createMutation.isPending ||
                    updateMutation.isPending ||
                    isReadOnly
                  }
                >
                  Save Draft{' '}
                  <KbdGroup className="ml-2">
                    <Kbd>{isMac ? '⌘' : 'Ctrl'}</Kbd>
                    <Kbd>S</Kbd>
                  </KbdGroup>
                </Button>
              )}
              {isFormReadyForSubmission && (
                <MagneticButton
                  type="button"
                  onClick={handleSubmitApplication}
                  disabled={submitMutation.isPending || !currentApplication?.id}
                >
                  {submitMutation.isPending
                    ? 'Submitting...'
                    : 'Submit Application'}
                </MagneticButton>
              )}
            </div>
          </CardFooter>
        </Form>
      </Card>
    </div>
  );
}
