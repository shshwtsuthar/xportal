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
import { useSubmissionReadiness } from '@/src/hooks/useSubmissionReadiness';
import { useCreateApplication } from '@/src/hooks/useCreateApplication';
import { useGetApplication } from '@/src/hooks/useGetApplication';
import { useUpdateApplication } from '@/src/hooks/useUpdateApplication';
import { usePersistApplicationArrays } from '@/src/hooks/usePersistApplicationArrays';
import { useSaveApplicationDraft } from '@/src/hooks/useSaveApplicationDraft';
import { mapApplicationToFormValues } from '@/src/hooks/useApplicationFormDefaults';
import {
  useGetApplicationDisabilities,
  useGetApplicationPriorEducation,
} from '@/src/hooks/useGetApplicationRelations';
import { Step1_PersonalDetails } from './steps/Step1_PersonalDetails';
import { Step2_AvetmissDetails } from './steps/Step2_AvetmissDetails';
import { Step3_AdditionalInfo } from './steps/Step3_AdditionalInfo';
import { Step3_Cricos } from './steps/Step3_Cricos';
import { EnrollmentStep } from './steps/Step4_Enrollment';
import { DocumentsPane } from './DocumentsPane';
import { PaymentStep } from './PaymentStep';
import { EnrollmentErrorBoundary } from './EnrollmentErrorBoundary';
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

  // Use created application data ONLY if we don't have an applicationId (new route)
  // This prevents stale createMutation.data from being used when editing existing apps
  const currentApplication =
    application || (!applicationId ? createMutation.data : undefined);

  // Fetch disabilities and prior education for form initialization
  const { data: dbDisabilities = [] } = useGetApplicationDisabilities(
    currentApplication?.id
  );
  const { data: dbPriorEducation = [] } = useGetApplicationPriorEducation(
    currentApplication?.id
  );

  // Only read-only if status exists and is not DRAFT (treat null/undefined as DRAFT)
  const isReadOnly = currentApplication?.status
    ? currentApplication.status !== 'DRAFT'
    : false;

  const updateMutation = useUpdateApplication();
  const submitMutation = useSubmitApplication();
  const uploadFileMutation = useUploadApplicationFile();
  const persistArraysMutation = usePersistApplicationArrays();
  const { saveDraft: saveDraftFn, isPending: isSavingDraft } =
    useSaveApplicationDraft();

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
      group_id: '',
      proposed_commencement_date: '',
      payment_plan_template_id: '',
      payment_anchor_date: '',
      agent_id: 'none',
      email: '',
      work_phone: '',
      mobile_phone: '',
      home_phone: '',
      alternative_email: '',
      address_line_1: '',
      suburb: '',
      state: '',
      postcode: '',
      street_building_name: '',
      street_unit_details: '',
      street_number: '',
      street_name: '',
      street_po_box: '',
      street_country: 'AU',
      postal_is_same_as_street: true,
      postal_building_name: '',
      postal_unit_details: '',
      postal_street_number: '',
      postal_street_name: '',
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
      study_reason_id: '',
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
      is_under_18: false,
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

  // Track the last initialized application to prevent infinite loops
  const lastInitializedAppId = useRef<string | undefined>(undefined);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Memoize disabilities array to prevent unnecessary re-renders
  const disabilitiesFormData = useMemo(() => {
    return dbDisabilities && dbDisabilities.length > 0
      ? dbDisabilities.map((d) => ({
          disability_type_id: d.disability_type_id,
        }))
      : [];
  }, [dbDisabilities]);

  // Memoize prior education array to prevent unnecessary re-renders
  const priorEducationFormData = useMemo(() => {
    return dbPriorEducation && dbPriorEducation.length > 0
      ? dbPriorEducation.map((e) => ({
          prior_achievement_id: e.prior_achievement_id,
          recognition_type: e.recognition_type || undefined,
        }))
      : [];
  }, [dbPriorEducation]);

  // Effect 1: Initialize form when application changes (core data only)
  useEffect(() => {
    if (
      currentApplication &&
      lastInitializedAppId.current !== currentApplication.id
    ) {
      const formValues = mapApplicationToFormValues(currentApplication);

      // Don't merge arrays here - they'll be handled by separate effects
      // This prevents race conditions where arrays load slower than the main application
      form.reset(formValues);
      lastInitializedAppId.current = currentApplication.id;
    }
  }, [currentApplication, form]);

  // Effect 2: Update disabilities array when it loads (handles late arrival of data)
  useEffect(() => {
    if (
      currentApplication?.id &&
      lastInitializedAppId.current === currentApplication.id &&
      disabilitiesFormData.length > 0
    ) {
      // Only update if the form doesn't already have these values
      const currentFormDisabilities = form.getValues('disabilities') || [];
      const formMatches =
        disabilitiesFormData.length === currentFormDisabilities.length &&
        disabilitiesFormData.every((dbDis) =>
          currentFormDisabilities.some(
            (formDis) => formDis.disability_type_id === dbDis.disability_type_id
          )
        );

      if (!formMatches) {
        form.setValue('disabilities', disabilitiesFormData, {
          shouldDirty: false,
        });
      }
    }
  }, [currentApplication?.id, disabilitiesFormData, form]);

  // Effect 3: Update prior education array when it loads (handles late arrival of data)
  useEffect(() => {
    if (
      currentApplication?.id &&
      lastInitializedAppId.current === currentApplication.id &&
      priorEducationFormData.length > 0
    ) {
      // Only update if the form doesn't already have these values
      const currentFormPriorEd = form.getValues('prior_education') || [];
      const formMatches =
        priorEducationFormData.length === currentFormPriorEd.length &&
        priorEducationFormData.every((dbEd) =>
          currentFormPriorEd.some(
            (formEd) =>
              formEd.prior_achievement_id === dbEd.prior_achievement_id &&
              formEd.recognition_type === dbEd.recognition_type
          )
        );

      if (!formMatches) {
        form.setValue('prior_education', priorEducationFormData, {
          shouldDirty: false,
        });
      }
    }
  }, [currentApplication?.id, priorEducationFormData, form]);

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
    await saveDraftFn({
      form,
      currentApplication,
      createMutation,
      isReadOnly,
      checkReadiness,
    });
  }, [
    saveDraftFn,
    form,
    currentApplication,
    createMutation,
    isReadOnly,
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
          createMutation.isPending || isSavingDraft || isReadOnly;

        if (!isDisabled) {
          event.preventDefault();
          handleSaveDraftRef.current();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [createMutation.isPending, isSavingDraft, isReadOnly]);

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

        // Update application and persist arrays
        updateMutation.mutate(
          { id: currentApplication.id, ...cleanedValues },
          {
            onSuccess: async () => {
              try {
                // Use the new hook to persist arrays with proper cache invalidation
                await persistArraysMutation.mutateAsync({
                  applicationId: currentApplication.id,
                  disabilities: values.disabilities || [],
                  priorEducation: values.prior_education || [],
                });
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
    if (activeStep === 4)
      return (
        <EnrollmentErrorBoundary>
          <EnrollmentStep form={form} />
        </EnrollmentErrorBoundary>
      );
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
                isSavingDraft ||
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
                isSavingDraft ||
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
                      createMutation.isPending || isSavingDraft || isReadOnly
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
                      createMutation.isPending || isSavingDraft || isReadOnly
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
