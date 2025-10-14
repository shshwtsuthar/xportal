'use client';

import { useEffect, useMemo, useState } from 'react';
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
      street_country: 'Australia',
      postal_is_same_as_street: false,
      postal_building_name: '',
      postal_unit_details: '',
      postal_number_name: '',
      postal_po_box: '',
      postal_suburb: '',
      postal_state: '',
      postal_postcode: '',
      postal_country: 'Australia',
      gender: '',
      highest_school_level_id: '',
      indigenous_status_id: '',
      labour_force_status_id: '',
      country_of_birth_id: '',
      language_code: '',
      citizenship_status_code: '',
      at_school_flag: '',
      is_international: false,
      usi: '',
      passport_number: '',
      visa_type: '',
      visa_number: '',
      country_of_citizenship: '',
      ielts_score: '',
      ec_name: '',
      ec_relationship: '',
      ec_phone_number: '',
      g_name: '',
      g_email: '',
      g_phone_number: '',
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
        street_country: currentApplication.street_country ?? 'Australia',
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
        postal_country: currentApplication.postal_country ?? 'Australia',
        gender: currentApplication.gender ?? '',
        highest_school_level_id:
          currentApplication.highest_school_level_id ?? '',
        indigenous_status_id: currentApplication.indigenous_status_id ?? '',
        labour_force_status_id: currentApplication.labour_force_status_id ?? '',
        country_of_birth_id: currentApplication.country_of_birth_id ?? '',
        language_code: currentApplication.language_code ?? '',
        citizenship_status_code:
          currentApplication.citizenship_status_code ?? '',
        at_school_flag: currentApplication.at_school_flag ?? '',
        is_international: Boolean(currentApplication.is_international),
        usi: currentApplication.usi ?? '',
        passport_number: currentApplication.passport_number ?? '',
        visa_type: currentApplication.visa_type ?? '',
        visa_number: currentApplication.visa_number ?? '',
        country_of_citizenship: currentApplication.country_of_citizenship ?? '',
        ielts_score: currentApplication.ielts_score ?? '',
        ec_name: currentApplication.ec_name ?? '',
        ec_relationship: currentApplication.ec_relationship ?? '',
        ec_phone_number: currentApplication.ec_phone_number ?? '',
        g_name: currentApplication.g_name ?? '',
        g_email: currentApplication.g_email ?? '',
        g_phone_number: currentApplication.g_phone_number ?? '',
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

  const handleSaveDraft = async () => {
    try {
      const values = form.getValues();

      // Validate format only (using draft schema) before saving
      const validationResult = draftApplicationSchema.safeParse(values);

      if (!validationResult.success) {
        console.log('Draft validation failed:', validationResult.error.issues);
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

      // Clean up empty strings for date fields to prevent PostgreSQL errors
      const cleanedValues = {
        ...values,
        date_of_birth: values.date_of_birth
          ? typeof values.date_of_birth === 'string'
            ? values.date_of_birth
            : values.date_of_birth.toISOString()
          : null,
        proposed_commencement_date: values.proposed_commencement_date || null,
        payment_anchor_date: values.payment_anchor_date || null,
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

      // If we have an application ID, update it
      if (currentApplication?.id) {
        updateMutation.mutate(
          { id: currentApplication.id, ...cleanedValues },
          {
            onSuccess: async () => {
              await afterPersistLearningPlan(currentApplication.id);
              await afterPersistPaymentSchedule(currentApplication.id);
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
          },
          onError: (err) =>
            toast.error(`Failed to create application: ${err.message}`),
        });
      }
    } catch (error) {
      console.error('Save draft error:', error);
      toast.error('Failed to save draft');
    }
  };

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
          <Button
            variant="outline"
            onClick={handleSaveDraft}
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {createMutation.isPending || updateMutation.isPending
              ? 'Saving...'
              : 'Save Draft'}
          </Button>
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
          <CardContent>{StepContent}</CardContent>
          <CardFooter className="flex items-center justify-between">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => goStep(Math.max(0, activeStep - 1))}
                aria-label="Previous step"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  goStep(Math.min(steps.length - 1, activeStep + 1))
                }
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
                  disabled={!currentApplication?.id}
                >
                  Upload file
                </Button>
              </label>
              <Button
                type="button"
                variant="outline"
                onClick={handleSaveDraft}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending
                  ? 'Saving...'
                  : 'Save Draft'}
              </Button>
              <Button
                type="button"
                onClick={handleSubmitApplication}
                disabled={submitMutation.isPending || !currentApplication?.id}
              >
                {submitMutation.isPending
                  ? 'Submitting...'
                  : 'Submit Application'}
              </Button>
            </div>
          </CardFooter>
        </Form>
      </Card>
    </div>
  );
}
