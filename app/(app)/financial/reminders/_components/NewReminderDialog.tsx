'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useGetPaymentPlanTemplates } from '@/src/hooks/useGetPaymentPlanTemplates';
import { useGetMailTemplates } from '@/src/hooks/useGetMailTemplates';
import { useCreatePaymentPlanReminder } from '@/src/hooks/useCreatePaymentPlanReminder';
import type { PaymentPlanReminderWithRelations } from '@/src/hooks/useGetPaymentPlanReminders';
import { useUpdatePaymentPlanReminder } from '@/src/hooks/useUpdatePaymentPlanReminder';

const formSchema = z.object({
  name: z.string().min(1, 'Reminder name is required'),
  templateId: z.string().min(1, 'Please select a template'),
  offsetDays: z
    .number()
    .int('Must be a whole number')
    .refine((val) => val !== 0, {
      message:
        'Offset cannot be 0. Use negative for before, positive for after.',
    }),
  mailTemplateId: z.string().min(1, 'Please select a mail template'),
  regenerateInvoice: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

type NewReminderDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingReminder?: PaymentPlanReminderWithRelations | null;
};

export function NewReminderDialog({
  open,
  onOpenChange,
  editingReminder,
}: NewReminderDialogProps) {
  const { data: templates } = useGetPaymentPlanTemplates('all');
  const { data: mailTemplatesData } = useGetMailTemplates({
    page: 1,
    pageSize: 100, // Fetch all templates for dropdown
  });
  const mailTemplates = mailTemplatesData?.items ?? [];
  const createReminder = useCreatePaymentPlanReminder();
  const updateReminder = useUpdatePaymentPlanReminder();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: editingReminder?.name || '',
      templateId: editingReminder?.template_id || '',
      offsetDays: editingReminder?.offset_days || -7,
      mailTemplateId: editingReminder?.mail_template_id || '',
      regenerateInvoice: editingReminder?.regenerate_invoice || false,
    },
  });

  React.useEffect(() => {
    if (editingReminder) {
      form.reset({
        name: editingReminder.name,
        templateId: editingReminder.template_id,
        offsetDays: editingReminder.offset_days,
        mailTemplateId: editingReminder.mail_template_id,
        regenerateInvoice: editingReminder.regenerate_invoice,
      });
    } else {
      form.reset({
        name: '',
        templateId: '',
        offsetDays: -7,
        mailTemplateId: '',
        regenerateInvoice: false,
      });
    }
  }, [editingReminder, form, open]);

  const watchedOffset = form.watch('offsetDays');

  const handleSubmit = async (values: FormValues) => {
    if (editingReminder) {
      await updateReminder.mutateAsync({
        id: editingReminder.id,
        name: values.name,
        offset_days: values.offsetDays,
        mail_template_id: values.mailTemplateId,
        regenerate_invoice: values.regenerateInvoice,
      });
    } else {
      await createReminder.mutateAsync({
        template_id: values.templateId,
        name: values.name,
        offset_days: values.offsetDays,
        mail_template_id: values.mailTemplateId,
        regenerate_invoice: values.regenerateInvoice,
      });
    }

    form.reset();
    onOpenChange(false);
  };

  const getPreviewText = (offset: number) => {
    if (offset < 0) {
      return `Reminder will trigger ${Math.abs(offset)} days BEFORE the due date`;
    } else if (offset > 0) {
      return `Reminder will trigger ${offset} days AFTER the due date`;
    } else {
      return 'Reminder will trigger ON the due date';
    }
  };

  const isLoading = createReminder.isPending || updateReminder.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>
            {editingReminder ? 'Edit Reminder' : 'New Reminder'}
          </DialogTitle>
          <DialogDescription>
            {editingReminder
              ? 'Update the reminder configuration'
              : 'Create a new payment reminder that will automatically send emails to students'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reminder Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., 7-Day Reminder" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!editingReminder && (
              <FormField
                control={form.control}
                name="templateId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Plan Template *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a template" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(templates ?? []).map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Reminder will apply to all non-deposit installments in
                      this template
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="offsetDays"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Offset (days) *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="e.g., -7 for 7 days before"
                      {...field}
                      value={field.value ?? ''}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value ? parseInt(e.target.value) : undefined
                        )
                      }
                    />
                  </FormControl>
                  <FormDescription className="text-sm">
                    {getPreviewText(watchedOffset ?? -7)}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="mailTemplateId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mail Template *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a mail template" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {mailTemplates.length > 0 ? (
                        mailTemplates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name} — {template.subject}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="text-muted-foreground px-2 py-1.5 text-sm">
                          No mail templates found
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    The email template to use for this reminder
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="regenerateInvoice"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      Regenerate and Attach Invoice
                    </FormLabel>
                    <FormDescription>
                      If enabled, the invoice PDF will be regenerated and
                      attached to the reminder email
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  form.reset();
                  onOpenChange(false);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading
                  ? editingReminder
                    ? 'Updating...'
                    : 'Creating...'
                  : editingReminder
                    ? 'Update'
                    : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
