'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type FieldErrors, type FieldError } from 'react-hook-form';
import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { toast } from 'sonner';
import { PaymentPlanTemplateForm } from '../../_components/PaymentPlanTemplateForm';
import { useUpsertPaymentPlanTemplate } from '@/src/hooks/useUpsertPaymentPlanTemplate';
import { useUpsertTemplateInstallments } from '@/src/hooks/useUpsertTemplateInstallments';
import { useUpsertTemplateInstallmentLines } from '@/src/hooks/useUpsertTemplateInstallmentLines';
import { useGetPaymentPlanTemplate } from '@/src/hooks/useGetPaymentPlanTemplate';
import { useGetTemplateInstallments } from '@/src/hooks/useGetTemplateInstallments';
import { createClient } from '@/lib/supabase/client';
import { z } from 'zod';

const templateSchema = z.object({
  name: z.string().min(1, 'Template name is required'),
  program_id: z.string().min(1, 'Program is required'),
  is_default: z.boolean(),
  installments: z
    .array(
      z.object({
        id: z.string().optional(),
        name: z.string().min(1, 'Installment name is required'),
        amount_cents: z.number().min(1, 'Amount must be greater than 0'),
        due_date_rule_days: z.number().min(0, 'Offset must be 0 or greater'),
        is_commissionable: z.boolean(),
        is_deposit: z.boolean(),
        lines: z
          .array(
            z.object({
              id: z.string().optional(),
              name: z.string().min(1, 'Line name is required'),
              description: z.string().optional(),
              amount_cents: z.number().min(1, 'Amount must be greater than 0'),
              sequence_order: z.number().min(0),
              is_commissionable: z.boolean(),
              xero_account_code: z.string().optional(),
              xero_tax_type: z.string().optional(),
              xero_item_code: z.string().optional(),
            })
          )
          .min(1, 'At least one line is required'),
      })
    )
    .min(1, 'At least one installment is required')
    .refine(
      (installments) => {
        return installments.every((inst) => {
          const linesSum = inst.lines.reduce(
            (sum, line) => sum + line.amount_cents,
            0
          );
          return linesSum === inst.amount_cents;
        });
      },
      {
        message: 'Installment amount must equal the sum of its line amounts',
        path: ['installments'],
      }
    ),
});

type TemplateFormValues = z.infer<typeof templateSchema>;

export default function EditPaymentPlanTemplatePage() {
  const params = useParams();
  const router = useRouter();
  const templateId = params.id as string;

  const { data: template, isLoading: templateLoading } =
    useGetPaymentPlanTemplate(templateId);
  const { data: installments, isLoading: installmentsLoading } =
    useGetTemplateInstallments(templateId);

  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateSchema),
    mode: 'onSubmit', // Only validate on submit, not on change
    defaultValues: {
      name: '',
      program_id: '',
      is_default: false,
      installments: [
        {
          name: '',
          amount_cents: 0,
          due_date_rule_days: 0,
          is_commissionable: false,
          is_deposit: false,
          lines: [
            {
              name: '',
              description: '',
              amount_cents: 0,
              sequence_order: 0,
              is_commissionable: true,
              xero_account_code: '',
              xero_tax_type: '',
              xero_item_code: '',
            },
          ],
        },
      ],
    },
  });

  // Load template, installments, and lines into form
  useEffect(() => {
    const loadData = async () => {
      if (!template || !installments) return;

      // Fetch lines for each installment
      const installmentsWithLines = await Promise.all(
        installments.map(async (inst) => {
          const { data: lines } = await createClient()
            .from('payment_plan_template_installment_lines')
            .select('*')
            .eq('installment_id', inst.id)
            .order('sequence_order', { ascending: true });

          return {
            id: inst.id,
            name: inst.name,
            amount_cents: inst.amount_cents,
            due_date_rule_days: inst.due_date_rule_days,
            is_commissionable: inst.is_commissionable ?? false,
            is_deposit: inst.is_deposit ?? false,
            lines:
              lines && lines.length > 0
                ? lines.map((line) => ({
                    id: line.id,
                    name: line.name,
                    description: line.description || '',
                    amount_cents: line.amount_cents,
                    sequence_order: line.sequence_order,
                    is_commissionable: line.is_commissionable,
                    xero_account_code: line.xero_account_code || '',
                    xero_tax_type: line.xero_tax_type || '',
                    xero_item_code: line.xero_item_code || '',
                  }))
                : [
                    {
                      name: '',
                      description: '',
                      amount_cents: inst.amount_cents,
                      sequence_order: 0,
                      is_commissionable: inst.is_commissionable ?? false,
                      xero_account_code: '',
                      xero_tax_type: '',
                      xero_item_code: '',
                    },
                  ],
          };
        })
      );

      form.reset({
        name: template.name,
        program_id: template.program_id as string,
        is_default: template.is_default ?? false,
        installments: installmentsWithLines,
      });
    };

    loadData();
  }, [template, installments, form]);

  const upsertTemplate = useUpsertPaymentPlanTemplate();
  const upsertInstallments = useUpsertTemplateInstallments();
  const upsertInstallmentLines = useUpsertTemplateInstallmentLines();

  const handleSubmit = async (values: TemplateFormValues) => {
    try {
      if (!templateId) {
        throw new Error('Template ID is required');
      }

      // Recalculate installment amounts from lines to ensure they match
      const recalculatedValues = {
        ...values,
        installments: values.installments.map((inst) => {
          const linesSum = inst.lines.reduce(
            (sum, line) => sum + (line.amount_cents || 0),
            0
          );
          return {
            ...inst,
            amount_cents: linesSum,
          };
        }),
      };

      // Re-validate with recalculated amounts
      const validationResult = templateSchema.safeParse(recalculatedValues);
      if (!validationResult.success) {
        // Set form errors
        validationResult.error.issues.forEach((issue) => {
          const fieldName = issue.path.join('.') as string;
          form.setError(fieldName as never, {
            message: issue.message,
          });
        });
        toast.error('Please fix validation errors before saving.');
        return;
      }

      // Use recalculated values for submission
      const finalValues = validationResult.data;

      const supabase = createClient();

      // Step 1: Update template
      const templatePayload = {
        id: templateId,
        name: finalValues.name,
        program_id: finalValues.program_id,
        is_default: finalValues.is_default,
      };

      await upsertTemplate.mutateAsync(templatePayload);

      // Step 2: Handle installments
      // Get IDs of installments that should remain
      const remainingIds = new Set(
        finalValues.installments
          .map((inst) => inst.id)
          .filter((id): id is string => !!id)
      );

      // Delete installments that were removed from the form
      if (installments) {
        const idsToDelete = installments
          .map((inst) => inst.id)
          .filter((id) => !remainingIds.has(id));

        if (idsToDelete.length > 0) {
          // Check if any of these installments are referenced in application_payment_schedule
          const { data: referencedInstallments, error: checkError } =
            await supabase
              .from('application_payment_schedule')
              .select('template_installment_id')
              .in('template_installment_id', idsToDelete)
              .limit(1);

          if (checkError) {
            throw new Error(
              `Failed to check installment references: ${checkError.message}`
            );
          }

          if (referencedInstallments && referencedInstallments.length > 0) {
            throw new Error(
              'Cannot delete installments that are referenced by existing applications. ' +
                'Please ensure no applications are using these installments before deleting them.'
            );
          }

          // Safe to delete - no references found
          const { error: deleteError } = await supabase
            .from('payment_plan_template_installments')
            .delete()
            .in('id', idsToDelete);
          if (deleteError) throw new Error(deleteError.message);
        }
      }

      // Step 3: Upsert installments (insert new ones, update existing ones)
      const installmentPayloads = finalValues.installments.map((inst) => ({
        template_id: templateId,
        name: inst.name,
        amount_cents: inst.amount_cents,
        due_date_rule_days: inst.due_date_rule_days,
        is_commissionable: inst.is_commissionable,
        is_deposit: inst.is_deposit,
        ...(inst.id ? { id: inst.id } : {}),
      }));

      await upsertInstallments.mutateAsync(installmentPayloads);

      // Step 4: Fetch installments to get IDs (for new ones)
      const { data: savedInstallmentsData, error: fetchError } = await supabase
        .from('payment_plan_template_installments')
        .select('id, due_date_rule_days')
        .eq('template_id', templateId)
        .order('due_date_rule_days', { ascending: true });

      if (fetchError) throw new Error(fetchError.message);

      // Step 5: Upsert lines for each installment
      for (let i = 0; i < finalValues.installments.length; i++) {
        const installment = finalValues.installments[i];
        // Match by ID if exists, otherwise by order
        const savedInstallment = installment.id
          ? savedInstallmentsData?.find((s) => s.id === installment.id)
          : savedInstallmentsData?.[i];

        if (!savedInstallment) {
          throw new Error(`Failed to find saved installment for index ${i}`);
        }

        const linePayloads = installment.lines.map((line) => ({
          ...(line.id ? { id: line.id } : {}),
          installment_id: savedInstallment.id,
          name: line.name,
          description: line.description || null,
          amount_cents: line.amount_cents,
          sequence_order: line.sequence_order,
          is_commissionable: line.is_commissionable,
          xero_account_code: line.xero_account_code || null,
          xero_tax_type: line.xero_tax_type || null,
          xero_item_code: line.xero_item_code || null,
        }));

        await upsertInstallmentLines.mutateAsync({
          installmentId: savedInstallment.id,
          lines: linePayloads,
        });
      }

      toast.success('Payment plan template updated');
      router.push('/financial/templates');
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      toast.error(errorMessage);
    }
  };

  const isLoading = templateLoading || installmentsLoading;

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 md:p-6 lg:p-8">
        <Card>
          <CardContent className="py-8">
            <p className="text-muted-foreground text-center text-sm">
              Loading template…
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="container mx-auto p-4 md:p-6 lg:p-8">
        <Card>
          <CardContent className="py-8">
            <p className="text-muted-foreground text-center text-sm">
              Template not found
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold tracking-tight">
            Edit Payment Plan Template
          </CardTitle>
        </CardHeader>
        <Form {...form}>
          <CardContent>
            <PaymentPlanTemplateForm form={form} />
          </CardContent>
          <CardFooter className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => router.push('/financial/templates')}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                form.handleSubmit(handleSubmit, (errors) => {
                  // Show validation errors
                  console.log('Validation errors:', errors);

                  // Find the first error message
                  type ErrorNode =
                    | FieldErrors<TemplateFormValues>
                    | FieldError
                    | string
                    | null
                    | undefined
                    | ErrorNode[];

                  const isRecord = (
                    value: unknown
                  ): value is Record<string, ErrorNode> =>
                    typeof value === 'object' &&
                    value !== null &&
                    !Array.isArray(value);

                  const hasMessage = (
                    value: unknown
                  ): value is { message?: string } =>
                    Boolean(
                      typeof value === 'object' &&
                      value !== null &&
                      'message' in value &&
                      (value as { message?: unknown }).message
                    );

                  const findFirstError = (obj: ErrorNode): string | null => {
                    if (!obj) return null;
                    if (typeof obj === 'string') return obj;
                    if (Array.isArray(obj)) {
                      for (const item of obj) {
                        const msg = findFirstError(item);
                        if (msg) return msg;
                      }
                      return null;
                    }
                    if (hasMessage(obj) && obj.message) {
                      return String(obj.message);
                    }
                    if (isRecord(obj)) {
                      for (const child of Object.values(obj)) {
                        const msg = findFirstError(child);
                        if (msg) return msg;
                      }
                    }
                    return null;
                  };

                  const errorMsg = findFirstError(errors);
                  if (errorMsg) {
                    toast.error(`Validation error: ${errorMsg}`);
                  } else {
                    toast.error('Please fill in all required fields correctly');
                  }
                })();
              }}
              disabled={
                upsertTemplate.isPending ||
                upsertInstallments.isPending ||
                upsertInstallmentLines.isPending
              }
            >
              {upsertTemplate.isPending ||
              upsertInstallments.isPending ||
              upsertInstallmentLines.isPending
                ? 'Updating…'
                : 'Update Template'}
            </Button>
          </CardFooter>
        </Form>
      </Card>
    </div>
  );
}
