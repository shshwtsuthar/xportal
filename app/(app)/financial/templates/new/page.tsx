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
import { useUpsertTemplateInstallmentLines } from '@/src/hooks/useUpsertTemplateInstallmentLines';
import { createClient } from '@/lib/supabase/client';
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

export default function NewPaymentPlanTemplatePage() {
  const router = useRouter();
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

  const upsertTemplate = useUpsertPaymentPlanTemplate();
  const upsertInstallments = useUpsertTemplateInstallments();
  const upsertInstallmentLines = useUpsertTemplateInstallmentLines();

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
        is_commissionable: inst.is_commissionable,
        is_deposit: inst.is_deposit,
      }));

      await upsertInstallments.mutateAsync(installmentPayloads);

      // Fetch installments to get their IDs
      const supabase = createClient();
      const { data: savedInstallmentsData, error: fetchError } = await supabase
        .from('payment_plan_template_installments')
        .select('id')
        .eq('template_id', templateId)
        .order('due_date_rule_days', { ascending: true });

      if (fetchError) throw new Error(fetchError.message);

      // Create lines for each installment
      for (let i = 0; i < values.installments.length; i++) {
        const installment = values.installments[i];
        const savedInstallmentId = savedInstallmentsData?.[i]?.id;

        if (!savedInstallmentId) {
          throw new Error(`Failed to find saved installment at index ${i}`);
        }

        const linePayloads = installment.lines.map((line) => ({
          installment_id: savedInstallmentId,
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
          installmentId: savedInstallmentId,
          lines: linePayloads,
        });
      }

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
                upsertTemplate.isPending ||
                upsertInstallments.isPending ||
                upsertInstallmentLines.isPending
              }
            >
              {upsertTemplate.isPending ||
              upsertInstallments.isPending ||
              upsertInstallmentLines.isPending
                ? 'Creating…'
                : 'Create Template'}
            </Button>
          </CardFooter>
        </Form>
      </Card>
    </div>
  );
}
