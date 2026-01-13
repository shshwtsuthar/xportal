'use client';

import { UseFormReturn } from 'react-hook-form';
import { useFieldArray } from 'react-hook-form';
import { useState, useEffect, useCallback } from 'react';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useGetPrograms } from '@/src/hooks/useGetPrograms';
import { Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
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
type InstallmentLines = TemplateFormValues['installments'][number]['lines'];

type Props = {
  form: UseFormReturn<TemplateFormValues>;
};

export function PaymentPlanTemplateForm({ form }: Props) {
  const { data: programs } = useGetPrograms();
  const [expandedInstallments, setExpandedInstallments] = useState<Set<number>>(
    new Set()
  );

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'installments',
  });

  const toggleInstallment = (index: number) => {
    const newExpanded = new Set(expandedInstallments);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedInstallments(newExpanded);
  };

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
          {fields.map((field, index) => {
            const isExpanded = expandedInstallments.has(index);

            return (
              <InstallmentCard
                key={field.id}
                form={form}
                index={index}
                isExpanded={isExpanded}
                onToggle={() => toggleInstallment(index)}
                onRemove={() => remove(index)}
                canRemove={fields.length > 1}
              />
            );
          })}
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              append({
                name: '',
                amount_cents: 0,
                due_date_rule_days: 0,
                is_commissionable: false, // Commissionability is now handled at line level
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
              })
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

type InstallmentCardProps = {
  form: UseFormReturn<TemplateFormValues>;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  onRemove: () => void;
  canRemove: boolean;
};

function InstallmentCard({
  form,
  index,
  isExpanded,
  onToggle,
  onRemove,
  canRemove,
}: InstallmentCardProps) {
  const {
    fields: lineFields,
    append: appendLine,
    remove: removeLine,
  } = useFieldArray({
    control: form.control,
    name: `installments.${index}.lines`,
  });

  const watchedLines =
    (form.watch(`installments.${index}.lines`) as InstallmentLines) ?? [];

  const updateInstallmentAmount = useCallback(
    (lines?: InstallmentLines) => {
      const values =
        lines ??
        ((form.getValues(`installments.${index}.lines`) ??
          []) as InstallmentLines);
      const sum = values.reduce(
        (acc, line) => acc + (line?.amount_cents ?? 0),
        0
      );
      form.setValue(`installments.${index}.amount_cents`, sum, {
        shouldValidate: false,
      });
    },
    [form, index]
  );

  useEffect(() => {
    updateInstallmentAmount(watchedLines);
  }, [watchedLines, updateInstallmentAmount]);

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <div className="rounded-md border">
        {/* Installment Header */}
        <div className="grid grid-cols-[auto_1fr_150px_150px_100px_auto] items-end gap-2 p-3">
          <CollapsibleTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>

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
                      placeholder="Auto-calculated"
                      {...field}
                      value={field.value || 0}
                      disabled
                      className="bg-muted cursor-not-allowed"
                      readOnly
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
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-1">
            <FormLabel className="text-xs">Is Deposit?</FormLabel>
            <FormField
              control={form.control}
              name={`installments.${index}.is_deposit`}
              render={({ field }) => (
                <FormItem className="flex items-center justify-center space-y-0 pt-2">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
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
            onClick={onRemove}
            disabled={!canRemove}
            aria-label="Remove installment"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Lines Section */}
        <CollapsibleContent>
          <div className="bg-muted/30 border-t p-4">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-medium">Lines</h4>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  appendLine({
                    name: '',
                    description: '',
                    amount_cents: 0,
                    sequence_order: lineFields.length,
                    is_commissionable: true,
                    xero_account_code: '',
                    xero_tax_type: '',
                    xero_item_code: '',
                  });
                  // Update installment amount after adding (will be 0, but that's ok for now)
                  updateInstallmentAmount();
                }}
              >
                <Plus className="mr-2 h-3 w-3" />
                Add Line
              </Button>
            </div>

            <div className="grid gap-3">
              {lineFields.map((lineField, lineIndex) => (
                <div
                  key={lineField.id}
                  className="bg-background grid grid-cols-[1fr_1fr_120px_100px_100px_auto] items-start gap-2 rounded-md border p-3"
                >
                  <div className="grid gap-1">
                    <FormLabel className="text-xs">Line Name *</FormLabel>
                    <FormField
                      control={form.control}
                      name={`installments.${index}.lines.${lineIndex}.name`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input placeholder="e.g., Tuition Fee" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid gap-1">
                    <FormLabel className="text-xs">Description</FormLabel>
                    <FormField
                      control={form.control}
                      name={`installments.${index}.lines.${lineIndex}.description`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              placeholder="Optional description"
                              {...field}
                              value={field.value || ''}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid gap-1">
                    <FormLabel className="text-xs">Amount (cents) *</FormLabel>
                    <FormField
                      control={form.control}
                      name={`installments.${index}.lines.${lineIndex}.amount_cents`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="50000"
                              {...field}
                              onChange={(e) => {
                                const value = Number(e.target.value) || 0;
                                field.onChange(value);
                                // Immediately update installment amount
                                updateInstallmentAmount();
                              }}
                              value={field.value || ''}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid gap-1">
                    <FormLabel className="text-xs">Sequence</FormLabel>
                    <FormField
                      control={form.control}
                      name={`installments.${index}.lines.${lineIndex}.sequence_order`}
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
                              value={field.value || 0}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid gap-1">
                    <FormLabel className="text-xs">Commissionable?</FormLabel>
                    <FormField
                      control={form.control}
                      name={`installments.${index}.lines.${lineIndex}.is_commissionable`}
                      render={({ field }) => (
                        <FormItem className="flex items-center space-y-0 space-x-2">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
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
                    onClick={() => {
                      removeLine(lineIndex);
                      // Update installment amount after removal
                      updateInstallmentAmount();
                    }}
                    disabled={lineFields.length === 1}
                    aria-label="Remove line"
                    className="mt-6"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>

                  {/* Xero Fields - Collapsible */}
                  <div className="col-span-full mt-2 grid grid-cols-3 gap-2">
                    <div className="grid gap-1">
                      <FormLabel className="text-xs">
                        Xero Account Code
                      </FormLabel>
                      <FormField
                        control={form.control}
                        name={`installments.${index}.lines.${lineIndex}.xero_account_code`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                placeholder="e.g., 200"
                                {...field}
                                value={field.value || ''}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid gap-1">
                      <FormLabel className="text-xs">Xero Tax Type</FormLabel>
                      <FormField
                        control={form.control}
                        name={`installments.${index}.lines.${lineIndex}.xero_tax_type`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                placeholder="e.g., GST"
                                {...field}
                                value={field.value || ''}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid gap-1">
                      <FormLabel className="text-xs">Xero Item Code</FormLabel>
                      <FormField
                        control={form.control}
                        name={`installments.${index}.lines.${lineIndex}.xero_item_code`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                placeholder="Optional"
                                {...field}
                                value={field.value || ''}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {lineFields.length === 0 && (
              <p className="text-muted-foreground py-4 text-center text-sm">
                No lines added. Click &ldquo;Add Line&rdquo; to add one.
              </p>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
