'use client';

import dynamic from 'next/dynamic';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { NumberFlowProps } from '@number-flow/react';
import { useForm } from 'react-hook-form';
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
import { Badge } from '@/components/ui/badge';
import { MagneticButton } from '@/components/ui/magnetic-button';
import { draftApplicationSchema } from '@/src/schemas';
import type { ApplicationFormValues } from '@/src/lib/applicationSchema';
import { useSubmissionReadiness } from '@/src/hooks/useSubmissionReadiness';
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
import { validateSubmission } from '@/src/schemas/application-submission';
import { Loader2 } from 'lucide-react';

const NumberFlow = dynamic<NumberFlowProps>(
  () => import('@number-flow/react'),
  { ssr: false }
);

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

const formatFieldLabel = (field: string) =>
  field
    .split('_')
    .map((segment) =>
      segment.length > 0 ? segment[0].toUpperCase() + segment.slice(1) : segment
    )
    .join(' ');

type ReadinessPreview = { preview: string[]; remainder: number };

type SubmissionReadinessCardProps = {
  isMounted: boolean;
  isValidating: boolean;
  missingFields: string[];
  readinessPreview: ReadinessPreview;
};

const SubmissionReadinessCard = memo(
  ({
    isMounted,
    isValidating,
    missingFields,
    readinessPreview,
  }: SubmissionReadinessCardProps) => {
    if (!isMounted) return null;
    return (
      <div
        aria-live="polite"
        suppressHydrationWarning
        aria-busy={isValidating}
        className="border-muted-foreground/40 bg-muted/30 text-muted-foreground w-full rounded-md border border-dashed p-3 text-sm"
      >
        <div className="text-muted-foreground/80 flex items-center justify-between text-xs tracking-wide uppercase">
          <span>Submission readiness</span>
          {isValidating && (
            <span className="text-foreground flex items-center gap-1 text-[11px] font-medium">
              <Loader2 className="h-3 w-3 animate-spin" />
              Updating…
            </span>
          )}
        </div>
        {missingFields.length === 0 ? (
          <span className="text-emerald-600">
            All mandatory fields are completed. You can submit.
          </span>
        ) : (
          <>
            <p className="text-foreground flex items-baseline gap-2 font-medium">
              <span className="text-foreground flex items-baseline gap-2 text-2xl font-semibold tracking-tight">
                <NumberFlow
                  value={missingFields.length}
                  className="font-mono [font-variant-numeric:tabular-nums]"
                />
              </span>
              requirement
              {missingFields.length === 1 ? '' : 's'} remaining before you can
              submit:
            </p>
            <div className="mt-2 flex flex-wrap gap-1">
              {readinessPreview.preview.map((field) => (
                <Badge
                  key={field}
                  variant="secondary"
                  className="text-xs font-normal"
                >
                  {formatFieldLabel(field)}
                </Badge>
              ))}
              {readinessPreview.remainder > 0 && (
                <Badge variant="outline" className="text-xs font-normal">
                  +{readinessPreview.remainder} more
                </Badge>
              )}
            </div>
          </>
        )}
      </div>
    );
  }
);
SubmissionReadinessCard.displayName = 'SubmissionReadinessCard';

export function NewApplicationWizard({ applicationId }: Props) {
  const [activeStep, setActiveStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
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
    mode: 'onBlur', // Validate fields on blur to show UI indicators for invalid inputs
    defaultValues: {
      salutation: '',
      first_name: '',
      middle_name: '',
      last_name: '',
      preferred_name: '',
      date_of_birth: '',
      program_id: '',
      timetable_id: '',
      preferred_location_id: '',
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
      disability_flag: '@' as const,
      prior_education_flag: '@' as const,
      disabilities: [],
      prior_education: [],
      year_highest_school_level_completed: '',
      survey_contact_status: 'A',
      vsn: '',
      is_international: false,
      usi: '',
      usi_exemption_code: undefined,
      passport_number: '',
      passport_issue_date: '',
      passport_expiry_date: '',
      place_of_birth: '',
      visa_type: '',
      visa_number: '',
      visa_application_office: '',
      holds_visa: false,
      country_of_citizenship: 'AU',
      ielts_score: '',
      has_english_test: false,
      english_test_type: '',
      english_test_date: '',
      has_previous_study_australia: false,
      previous_provider_name: '',
      completed_previous_course: undefined,
      has_release_letter: undefined,
      provider_accepting_welfare_responsibility: undefined,
      welfare_start_date: '',
      provider_arranged_oshc: false,
      oshc_provider_name: '',
      oshc_start_date: '',
      oshc_end_date: '',
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
    setIsMounted(true);
  }, []);

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
        preferred_location_id: currentApplication.preferred_location_id ?? '',
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
            ? ('@' as const)
            : (currentApplication.disability_flag as 'Y' | 'N' | '@'),
        prior_education_flag:
          currentApplication.prior_education_flag === null ||
          currentApplication.prior_education_flag === undefined
            ? ('@' as const)
            : (currentApplication.prior_education_flag as 'Y' | 'N' | '@'),
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
        usi_exemption_code: (() => {
          const value = (currentApplication as Record<string, unknown>)
            .usi_exemption_code;
          return value === 'INDIV' || value === 'INTOFF' ? value : undefined;
        })(),
        passport_number: currentApplication.passport_number ?? '',
        passport_issue_date: currentApplication.passport_issue_date ?? '',
        passport_expiry_date: currentApplication.passport_expiry_date ?? '',
        place_of_birth: currentApplication.place_of_birth ?? '',
        visa_type: currentApplication.visa_type ?? '',
        visa_number: currentApplication.visa_number ?? '',
        visa_application_office:
          currentApplication.visa_application_office ?? '',
        holds_visa: currentApplication.holds_visa ?? false,
        country_of_citizenship:
          currentApplication.country_of_citizenship ?? 'AU',
        ielts_score: currentApplication.ielts_score ?? '',
        has_english_test: Boolean(currentApplication.has_english_test),
        english_test_type: currentApplication.english_test_type ?? '',
        english_test_date: currentApplication.english_test_date ?? '',
        has_previous_study_australia: Boolean(
          currentApplication.has_previous_study_australia
        ),
        previous_provider_name: currentApplication.previous_provider_name ?? '',
        completed_previous_course:
          currentApplication.completed_previous_course ?? undefined,
        has_release_letter: currentApplication.has_release_letter ?? undefined,
        provider_accepting_welfare_responsibility:
          currentApplication.provider_accepting_welfare_responsibility ??
          undefined,
        welfare_start_date: currentApplication.welfare_start_date ?? '',
        provider_arranged_oshc: Boolean(
          currentApplication.provider_arranged_oshc
        ),
        oshc_provider_name: currentApplication.oshc_provider_name ?? '',
        oshc_start_date: currentApplication.oshc_start_date ?? '',
        oshc_end_date: currentApplication.oshc_end_date ?? '',
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

  // Readiness engine (manual checking on SaveDraft and step changes)
  const {
    isReady: isFormReadyForSubmission,
    isValidating,
    missing: missingFields,
    checkReadiness,
  } = useSubmissionReadiness(form);

  const handleSaveDraft = useCallback(async () => {
    if (isReadOnly) {
      toast.error(
        'Cannot save: Application has been submitted and is read-only.'
      );
      return;
    }
    try {
      const values = form.getValues();

      // Save Draft: Save whatever is in the form, NO VALIDATION
      // Validation only happens when submitting via handleSubmitApplication

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

      // For updates, exclude preferred_location_id if it's null/empty to avoid overwriting existing value
      // For creates, useCreateApplication will set a default location
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
        passport_expiry_date: convertDateToString(values.passport_expiry_date),
        welfare_start_date: convertDateToString(values.welfare_start_date),
        oshc_start_date: convertDateToString(values.oshc_start_date),
        oshc_end_date: convertDateToString(values.oshc_end_date),
        english_test_date: convertDateToString(values.english_test_date),
        // Clean up null values for optional flag fields
        // Schema expects 'Y', 'N', '@', or undefined (not null)
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
          }
          toast.success('Draft saved');
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
              checkReadiness();
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
              checkReadiness();
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
            checkReadiness();
          },
          onError: (err) =>
            toast.error(`Failed to create application: ${err.message}`),
        });
      }
    } catch (error) {
      console.error('Save draft error:', error);
      toast.error('Failed to save draft');
    }
  }, [
    isReadOnly,
    form,
    updateMutation,
    createMutation,
    currentApplication,
    checkReadiness,
  ]);

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
    // Check readiness after step change
    checkReadiness();
  };

  const handleSubmitApplication = async () => {
    if (!currentApplication?.id) {
      toast.error('No application found. Please save your draft first.');
      return;
    }

    if (isSubmitting) {
      // Prevent double submission
      return;
    }

    setIsSubmitting(true);

    try {
      // Step 1: Save draft first to ensure form state (especially arrays) is synced to database
      // This is critical because server-side validation queries the database, not form state
      toast.info('Saving draft...');
      await new Promise<void>((resolve, reject) => {
        if (isReadOnly) {
          reject(new Error('Application is read-only'));
          return;
        }

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

        // Clean up empty strings for date fields
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { disabilities, prior_education, ...valuesWithoutArrays } =
          values;

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
          passport_issue_date: convertDateToString(values.passport_issue_date),
          passport_expiry_date: convertDateToString(
            values.passport_expiry_date
          ),
          welfare_start_date: convertDateToString(values.welfare_start_date),
          oshc_start_date: convertDateToString(values.oshc_start_date),
          oshc_end_date: convertDateToString(values.oshc_end_date),
          english_test_date: convertDateToString(values.english_test_date),
          // Normalize flags: null/undefined → '@' to ensure consistency with validation
          disability_flag:
            values.disability_flag === null ||
            values.disability_flag === undefined
              ? '@'
              : values.disability_flag,
          prior_education_flag:
            values.prior_education_flag === null ||
            values.prior_education_flag === undefined
              ? '@'
              : values.prior_education_flag,
          email: values.email || null,
          alternative_email: values.alternative_email || null,
          g_email: values.g_email || null,
          agent_id: values.agent_id === 'none' ? null : values.agent_id || null,
          timetable_id: values.timetable_id || null,
          program_id: values.program_id || null,
          payment_plan_template_id: values.payment_plan_template_id || null,
        };

        const afterPersistDisabilitiesAndPriorEducation = async (
          applicationId: string
        ) => {
          const supabase = createClient();
          const { data: sessionData } = await supabase.auth.getSession();
          const rtoId = (
            sessionData.session?.user?.app_metadata as Record<string, unknown>
          )?.rto_id as string;
          if (!rtoId) {
            throw new Error(
              'Failed to save draft: User RTO not found in session metadata. Please refresh the page and try again.'
            );
          }

          // Defensive check: ensure arrays are defined
          const formDisabilities = values.disabilities || [];
          const formPriorEducation = values.prior_education || [];

          // Delete all existing disabilities
          const { error: deleteDisErr } = await supabase
            .from('application_disabilities')
            .delete()
            .eq('application_id', applicationId);

          if (deleteDisErr) {
            throw new Error(
              `Failed to save draft: Could not delete existing disabilities. ${deleteDisErr.message}`
            );
          }

          // Insert new disabilities
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
              throw new Error(
                `Failed to save draft: Could not save disabilities. ${insertDisErr.message}`
              );
            }
          }

          // Delete all existing prior education
          const { error: deletePriorEdErr } = await supabase
            .from('application_prior_education')
            .delete()
            .eq('application_id', applicationId);

          if (deletePriorEdErr) {
            throw new Error(
              `Failed to save draft: Could not delete existing prior education. ${deletePriorEdErr.message}`
            );
          }

          // Insert new prior education
          if (formPriorEducation.length > 0) {
            const priorEdInserts = formPriorEducation.map((e) => ({
              application_id: applicationId,
              rto_id: rtoId,
              prior_achievement_id: e.prior_achievement_id,
              recognition_type: e.recognition_type || null,
            }));

            const { error: insertPriorEdErr } = await supabase
              .from('application_prior_education')
              .insert(priorEdInserts);

            if (insertPriorEdErr) {
              throw new Error(
                `Failed to save draft: Could not save prior education. ${insertPriorEdErr.message}`
              );
            }
          }
        };

        // Update application and persist arrays
        updateMutation.mutate(
          { id: currentApplication.id, ...cleanedValues },
          {
            onSuccess: async () => {
              try {
                await afterPersistDisabilitiesAndPriorEducation(
                  currentApplication.id
                );
                resolve();
              } catch (e) {
                reject(e);
              }
            },
            onError: (error) => {
              reject(
                new Error(
                  `Failed to save draft: ${error.message}. Please check your connection and try again.`
                )
              );
            },
          }
        );
      });

      // Step 2: Fetch complete application state from database and validate
      // This ensures validation matches what the server will validate
      toast.info('Validating application...');
      const supabase = createClient();

      // Fetch application from database
      const { data: savedApplication, error: fetchError } = await supabase
        .from('applications')
        .select('*')
        .eq('id', currentApplication.id)
        .single();

      if (fetchError) {
        console.error(
          '[Submit Application] Error fetching application:',
          fetchError
        );
        toast.error(
          `Failed to fetch application for validation: ${fetchError.message}`
        );
        setIsSubmitting(false);
        return;
      }

      // Fetch arrays from junction tables
      const { data: disabilitiesData, error: disabilitiesErr } = await supabase
        .from('application_disabilities')
        .select('disability_type_id')
        .eq('application_id', currentApplication.id);

      if (disabilitiesErr) {
        console.error(
          '[Submit Application] Error fetching disabilities:',
          disabilitiesErr
        );
        toast.error(
          `Failed to fetch disabilities for validation: ${disabilitiesErr.message}`
        );
        setIsSubmitting(false);
        return;
      }

      const { data: priorEdData, error: priorEdErr } = await supabase
        .from('application_prior_education')
        .select('prior_achievement_id, recognition_type')
        .eq('application_id', currentApplication.id);

      if (priorEdErr) {
        console.error(
          '[Submit Application] Error fetching prior education:',
          priorEdErr
        );
        toast.error(
          `Failed to fetch prior education for validation: ${priorEdErr.message}`
        );
        setIsSubmitting(false);
        return;
      }

      // Transform to match schema format
      const applicationWithArrays = {
        ...savedApplication,
        disabilities: (disabilitiesData || []).map((d) => ({
          disability_type_id: d.disability_type_id,
        })),
        prior_education: (priorEdData || []).map((e) => ({
          prior_achievement_id: e.prior_achievement_id,
          recognition_type: e.recognition_type || undefined,
        })),
      };

      // Validate the database state (not form state)
      const validation = validateSubmission(applicationWithArrays);

      if (!validation.ok) {
        console.error(
          '[Submit Application] Validation failed:',
          validation.issues
        );
        console.error(
          '[Submit Application] Application data that failed:',
          applicationWithArrays
        );
        const errorMessages = validation.issues
          .map((i) => `${i.path}: ${i.message}`)
          .join(', ');
        toast.error(
          `Validation failed. Please fix the following issues: ${errorMessages}`
        );
        setIsSubmitting(false);
        return;
      }

      // Step 3: Submit the application
      toast.info('Submitting application...');
      submitMutation.mutate(
        { applicationId: currentApplication.id },
        {
          onSuccess: () => {
            setIsSubmitting(false);
            toast.success('Application submitted successfully');
            window.location.href = '/applications';
          },
          onError: (e) => {
            setIsSubmitting(false);
            toast.error(`Failed to submit application: ${String(e)}`);
          },
        }
      );
    } catch (error) {
      console.error('Submit application error:', error);
      setIsSubmitting(false);
      toast.error(
        `Failed to prepare application for submission: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  };

  const readinessPreview = useMemo(() => {
    const preview = missingFields.slice(0, 10);
    const remainder =
      missingFields.length > preview.length
        ? missingFields.length - preview.length
        : 0;
    return { preview, remainder };
  }, [missingFields]);

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

  const readinessSummary = (
    <SubmissionReadinessCard
      isMounted={isMounted}
      isValidating={isValidating}
      missingFields={missingFields}
      readinessPreview={readinessPreview}
    />
  );

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
              type="button"
              variant="outline"
              onClick={handleSaveDraft}
              disabled={
                createMutation.isPending ||
                updateMutation.isPending ||
                isReadOnly ||
                isValidating
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
                isReadOnly ||
                isValidating
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
        <CardContent className="py-0">{readinessSummary}</CardContent>
        <Form {...form}>
          <CardContent>
            <div className={isReadOnly ? 'pointer-events-none opacity-60' : ''}>
              {StepContent}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex flex-col gap-4 lg:w-2/3">
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
            </div>
            <div className="flex flex-col gap-2 lg:w-1/3">
              <div className="flex items-center justify-end gap-2">
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
                          `Upload failed: ${String(
                            (err as Error).message || err
                          )}`
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
                    disabled={
                      submitMutation.isPending ||
                      !currentApplication?.id ||
                      isValidating ||
                      isSubmitting
                    }
                  >
                    {isSubmitting || submitMutation.isPending
                      ? 'Submitting...'
                      : 'Submit Application'}
                  </MagneticButton>
                )}
              </div>
            </div>
          </CardFooter>
        </Form>
      </Card>
    </div>
  );
}
