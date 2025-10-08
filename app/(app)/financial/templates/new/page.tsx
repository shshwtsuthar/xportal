'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
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
import { PaymentPlanTemplateForm } from '../_components/PaymentPlanTemplateForm';
import { useUpsertPaymentPlanTemplate } from '@/src/hooks/useUpsertPaymentPlanTemplate';
import { useUpsertTemplateInstallments } from '@/src/hooks/useUpsertTemplateInstallments';
import { useRouter } from 'next/navigation';
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
      })
    )
    .min(1, 'At least one installment is required'),
});

type TemplateFormValues = z.infer<typeof templateSchema>;

export default function NewPaymentPlanTemplatePage() {
  const router = useRouter();
  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: '',
      program_id: '',
      is_default: false,
      installments: [{ name: '', amount_cents: 0, due_date_rule_days: 0 }],
    },
  });

  const upsertTemplate = useUpsertPaymentPlanTemplate();
  const upsertInstallments = useUpsertTemplateInstallments();

  const handleSubmit = async (values: TemplateFormValues) => {
    try {
      // Step 1: Create template
      const templatePayload = {
        name: values.name,
        program_id: values.program_id,
        is_default: values.is_default,
      };

      const savedTemplate = await upsertTemplate.mutateAsync(templatePayload);
      const templateId = savedTemplate?.id;

      if (!templateId) {
        throw new Error('Failed to save template');
      }

      // Step 2: Create installments
      const installmentPayloads = values.installments.map((inst) => ({
        template_id: templateId,
        name: inst.name,
        amount_cents: inst.amount_cents,
        due_date_rule_days: inst.due_date_rule_days,
      }));

      await upsertInstallments.mutateAsync(installmentPayloads);

      toast.success('Payment plan template created');
      router.push('/financial/templates');
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      toast.error(errorMessage);
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold tracking-tight">
            New Payment Plan Template
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
                ? 'Creating…'
                : 'Create Template'}
            </Button>
          </CardFooter>
        </Form>
      </Card>
    </div>
  );
}
