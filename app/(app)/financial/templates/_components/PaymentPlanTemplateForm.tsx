'use client';

import { UseFormReturn } from 'react-hook-form';
import { useFieldArray } from 'react-hook-form';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useGetPrograms } from '@/src/hooks/useGetPrograms';
import { Plus, Trash2 } from 'lucide-react';
import { z } from 'zod';

// Schema used only for type inference
// eslint-disable-next-line @typescript-eslint/no-unused-vars
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

type Props = {
  form: UseFormReturn<TemplateFormValues>;
};

export function PaymentPlanTemplateForm({ form }: Props) {
  const { data: programs } = useGetPrograms();

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'installments',
  });

  return (
    <div className="grid gap-6">
      {/* Template Details */}
      <div className="grid gap-4 md:grid-cols-2">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Template Name *</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., Standard 12-Month Installment Plan"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="program_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Program *</FormLabel>
              <FormControl>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a program" />
                  </SelectTrigger>
                  <SelectContent>
                    {(programs ?? []).length === 0 ? (
                      <div className="text-muted-foreground px-2 py-1.5 text-sm">
                        No programs yet
                      </div>
                    ) : (
                      programs?.map((p) => (
                        <SelectItem key={p.id} value={p.id as string}>
                          {p.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="is_default"
          render={({ field }) => (
            <FormItem className="flex items-center space-y-0 space-x-2">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <FormLabel className="cursor-pointer">
                Set as default plan for this program
              </FormLabel>
            </FormItem>
          )}
        />
      </div>

      {/* Installments */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">
            Installment Schedule
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          {fields.map((field, index) => (
            <div
              key={field.id}
              className="grid grid-cols-[1fr_150px_150px_auto] items-end gap-2 rounded-md border p-3"
            >
              <div className="grid gap-1">
                <FormLabel className="text-xs">Name</FormLabel>
                <FormField
                  control={form.control}
                  name={`installments.${index}.name`}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input placeholder="e.g., Enrollment Fee" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid gap-1">
                <FormLabel className="text-xs">Amount (cents)</FormLabel>
                <FormField
                  control={form.control}
                  name={`installments.${index}.amount_cents`}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="50000"
                          {...field}
                          onChange={(e) =>
                            field.onChange(Number(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid gap-1">
                <FormLabel className="text-xs">Offset (days)</FormLabel>
                <FormField
                  control={form.control}
                  name={`installments.${index}.due_date_rule_days`}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="0"
                          {...field}
                          onChange={(e) =>
                            field.onChange(Number(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => remove(index)}
                disabled={fields.length === 1}
                aria-label="Remove installment"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              append({ name: '', amount_cents: 0, due_date_rule_days: 0 })
            }
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Installment
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
