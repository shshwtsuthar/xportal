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
import { useGetPaymentPlanTemplates } from '@/src/hooks/useGetPaymentPlanTemplates';
import { useUpdateTemplateIssueDate } from '@/src/hooks/useUpdateTemplateIssueDate';

const formSchema = z.object({
  templateId: z.string().min(1, 'Please select a template'),
  offsetDays: z.number().int('Must be a whole number'),
});

type FormValues = z.infer<typeof formSchema>;

type SetIssueDateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SetIssueDateDialog({
  open,
  onOpenChange,
}: SetIssueDateDialogProps) {
  const { data: templates } = useGetPaymentPlanTemplates('all');
  const updateIssueDate = useUpdateTemplateIssueDate();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      templateId: '',
      offsetDays: 0,
    },
  });

  const watchedOffset = form.watch('offsetDays');

  const handleSubmit = async (values: FormValues) => {
    await updateIssueDate.mutateAsync({
      templateId: values.templateId,
      offsetDays: values.offsetDays,
    });

    form.reset();
    onOpenChange(false);
  };

  const getPreviewText = (offset: number) => {
    if (offset < 0) {
      return `Issue date will be ${Math.abs(offset)} days BEFORE the due date`;
    } else if (offset > 0) {
      return `Issue date will be ${offset} days AFTER the due date`;
    } else {
      return 'Issue date will be the SAME as the due date';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Set Issue Date Offset</DialogTitle>
          <DialogDescription>
            Configure when invoices should be issued relative to their due date.
            This will update the selected template and recalculate future
            invoices.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
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
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="offsetDays"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Offset (days) *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="e.g., -14 for 14 days before due date"
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
                    {getPreviewText(watchedOffset ?? 0)}
                  </FormDescription>
                  <FormMessage />
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
              <Button type="submit" disabled={updateIssueDate.isPending}>
                {updateIssueDate.isPending ? 'Updating...' : 'Update'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
