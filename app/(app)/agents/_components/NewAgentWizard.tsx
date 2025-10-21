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
import { agentSchema, type AgentFormValues } from '@/lib/validators/agent';
import { useCreateAgent } from '@/src/hooks/useCreateAgent';
import { useGetAgent } from '@/src/hooks/useGetAgent';
import { useUpdateAgent } from '@/src/hooks/useUpdateAgent';
import { AgentForm } from './AgentForm';
import { DocumentsPane } from './DocumentsPane';
import { useUploadAgentFile } from '@/src/hooks/useAgentFiles';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

type Props = { agentId?: string };

const steps = [
  { id: 1, label: 'Details' },
  { id: 2, label: 'Documents' },
];

export function NewAgentWizard({ agentId }: Props) {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(0);
  const createMutation = useCreateAgent();
  const { data: agent } = useGetAgent(agentId);

  // Use created agent data if we just created one
  const currentAgent = agent || createMutation.data;

  const updateMutation = useUpdateAgent();
  const uploadFileMutation = useUploadAgentFile();

  const form = useForm<AgentFormValues>({
    resolver: zodResolver(agentSchema),
    defaultValues: {
      name: '',
      slug: '',
      contact_person: '',
      contact_email: '',
      contact_phone: '',
    },
  });

  useEffect(() => {
    if (currentAgent) {
      const toReset: Partial<AgentFormValues> = {
        name: currentAgent.name ?? '',
        slug: currentAgent.slug ?? '',
        contact_person: currentAgent.contact_person ?? '',
        contact_email: currentAgent.contact_email ?? '',
        contact_phone: currentAgent.contact_phone ?? '',
      };
      form.reset(toReset);
    }
  }, [currentAgent, form]);

  const handleSaveDraft = async () => {
    try {
      const values = form.getValues();

      // Validate format before saving
      const validationResult = agentSchema.safeParse(values);

      if (!validationResult.success) {
        console.log('Validation failed:', validationResult.error.issues);
        // Set form errors for display
        validationResult.error.issues.forEach((issue) => {
          const fieldName = issue.path.join('.') as string;
          form.setError(fieldName as never, {
            message: issue.message,
          });
        });
        toast.error('Please fix validation errors before saving.');
        return;
      }

      // Clean up empty strings
      const cleanedValues = {
        ...values,
        contact_person: values.contact_person || null,
        contact_email: values.contact_email || null,
        contact_phone: values.contact_phone || null,
      };

      // If we have an agent ID, update it
      if (currentAgent?.id) {
        updateMutation.mutate(
          { id: currentAgent.id, ...cleanedValues },
          {
            onSuccess: () => toast.success('Agent updated'),
            onError: (error) =>
              toast.error(`Failed to update agent: ${error.message}`),
          }
        );
      } else if (createMutation.isPending) {
        // If creation is already in progress, wait for it to complete
        toast.info('Creating agent, please wait...');
      } else if (createMutation.isSuccess && createMutation.data?.id) {
        // If creation was successful but agent state hasn't updated yet, use the created data
        updateMutation.mutate(
          { id: createMutation.data.id, ...cleanedValues },
          {
            onSuccess: () => toast.success('Agent updated'),
            onError: (error) =>
              toast.error(`Failed to update agent: ${error.message}`),
          }
        );
      } else {
        // Only create if we're not already pending and haven't succeeded
        createMutation.mutate(cleanedValues, {
          onSuccess: (created) => {
            // Redirect to edit page
            window.history.replaceState(null, '', `/agents/edit/${created.id}`);
            toast.success('Agent created');
          },
          onError: (err) =>
            toast.error(`Failed to create agent: ${err.message}`),
        });
      }
    } catch (error) {
      console.error('Save draft error:', error);
      toast.error('Failed to save agent');
    }
  };

  const goStep = async (next: number) => {
    await handleSaveDraft();
    setActiveStep(next);
  };

  const handleFinish = async () => {
    try {
      await handleSaveDraft();
      toast.success('Agent saved successfully');
      router.push('/agents');
    } catch (error) {
      console.error('Finish error:', error);
      toast.error('Failed to save agent');
    }
  };

  const StepContent = useMemo(() => {
    if (activeStep === 0) return <AgentForm form={form} />;
    if (activeStep === 1) return <DocumentsPane agentId={currentAgent?.id} />;
    return null;
  }, [activeStep, currentAgent, form]);

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {agentId ? 'Edit Agent' : 'New Agent'}
          </h1>
          <p className="text-muted-foreground text-sm">
            Complete all steps to create a new agent
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
                      if (!currentAgent?.id) {
                        toast.error('Save draft to enable uploads.');
                        return;
                      }
                      if (file.size > 10 * 1024 * 1024) {
                        toast.error('File too large (max 10MB).');
                        return;
                      }
                      await uploadFileMutation.mutateAsync({
                        agentId: currentAgent.id,
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
                  disabled={!currentAgent?.id}
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
                onClick={handleFinish}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending
                  ? 'Saving...'
                  : 'Finish'}
              </Button>
            </div>
          </CardFooter>
        </Form>
      </Card>
    </div>
  );
}
