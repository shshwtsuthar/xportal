'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
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
      })
    )
    .min(1, 'At least one installment is required'),
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
        },
      ],
    },
  });

  // Load template and installments into form
  useEffect(() => {
    if (template && installments) {
      form.reset({
        name: template.name,
        program_id: template.program_id as string,
        is_default: template.is_default ?? false,
        installments: installments.map((inst) => ({
          id: inst.id,
          name: inst.name,
          amount_cents: inst.amount_cents,
          due_date_rule_days: inst.due_date_rule_days,
          is_commissionable: inst.is_commissionable ?? false,
        })),
      });
    }
  }, [template, installments, form]);

  const upsertTemplate = useUpsertPaymentPlanTemplate();
  const upsertInstallments = useUpsertTemplateInstallments();

  const handleSubmit = async (values: TemplateFormValues) => {
    try {
      if (!templateId) {
        throw new Error('Template ID is required');
      }

      const supabase = createClient();

      // Step 1: Update template
      const templatePayload = {
        id: templateId,
        name: values.name,
        program_id: values.program_id,
        is_default: values.is_default,
      };

      await upsertTemplate.mutateAsync(templatePayload);

      // Step 2: Handle installments
      // Get IDs of installments that should remain
      const remainingIds = new Set(
        values.installments
          .map((inst) => inst.id)
          .filter((id): id is string => !!id)
      );

      // Delete installments that were removed from the form
      if (installments) {
        const idsToDelete = installments
          .map((inst) => inst.id)
          .filter((id) => !remainingIds.has(id));

        if (idsToDelete.length > 0) {
          const { error: deleteError } = await supabase
            .from('payment_plan_template_installments')
            .delete()
            .in('id', idsToDelete);
          if (deleteError) throw new Error(deleteError.message);
        }
      }

      // Step 3: Upsert installments (insert new ones, update existing ones)
      const installmentPayloads = values.installments.map((inst) => ({
        template_id: templateId,
        name: inst.name,
        amount_cents: inst.amount_cents,
        due_date_rule_days: inst.due_date_rule_days,
        is_commissionable: inst.is_commissionable,
        ...(inst.id ? { id: inst.id } : {}),
      }));

      await upsertInstallments.mutateAsync(installmentPayloads);

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
              onClick={form.handleSubmit(handleSubmit)}
              disabled={
                upsertTemplate.isPending || upsertInstallments.isPending
              }
            >
              {upsertTemplate.isPending || upsertInstallments.isPending
                ? 'Updating…'
                : 'Update Template'}
            </Button>
          </CardFooter>
        </Form>
      </Card>
    </div>
  );
}
