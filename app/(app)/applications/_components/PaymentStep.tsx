'use client';

import { useMemo, useState, useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Tables } from '@/database.types';
import { ApplicationFormValues } from '@/src/schemas';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { formatDateToLocal, calculateDueDates } from '@/lib/utils/date';
import { useGetPaymentPlanTemplates } from '@/src/hooks/useGetPaymentPlanTemplates';
import { useGetTemplateInstallments } from '@/src/hooks/useGetTemplateInstallments';

// Union type that can handle both draft and final application forms
type FlexibleFormValues =
  | ApplicationFormValues
  | {
      email?: string; // Optional in draftApplicationSchema
      program_id?: string;
      payment_plan_template_id?: string;
      payment_anchor_date?: string;
      [key: string]: unknown; // Allow other fields for flexibility
    };

type Props = {
  application: Tables<'applications'>;
  form: UseFormReturn<FlexibleFormValues>;
};

export const PaymentStep = ({ application, form }: Props) => {
  const programId = form.watch('program_id');
  const {
    data: templates = [],
    isLoading: templatesLoading,
    error: templatesError,
  } = useGetPaymentPlanTemplates(programId ?? undefined);

  const [selectedTemplateId, setSelectedTemplateId] = useState<
    string | undefined
  >(application.payment_plan_template_id ?? undefined);

  const { data: installments = [], isLoading: installmentsLoading } =
    useGetTemplateInstallments(selectedTemplateId);

  const [anchorDate, setAnchorDate] = useState<Date | undefined>(
    application.payment_anchor_date
      ? new Date(application.payment_anchor_date)
      : undefined
  );

  // Update selected template when templates load and we don't have a selection
  useEffect(() => {
    if (templates.length > 0 && !selectedTemplateId) {
      const defaultTemplate = templates.find((t) => t.is_default);
      if (defaultTemplate) {
        setSelectedTemplateId(defaultTemplate.id as string);
      }
    }
  }, [templates, selectedTemplateId]);

  // Update form values when payment plan data changes
  useEffect(() => {
    if (selectedTemplateId && anchorDate) {
      form.setValue('payment_plan_template_id', selectedTemplateId);
      form.setValue('payment_anchor_date', formatDateToLocal(anchorDate));
    }
  }, [selectedTemplateId, anchorDate, form]);

  const preview = useMemo(() => {
    if (!anchorDate || installments.length === 0)
      return [] as { name: string; amount: number; due: string }[];

    const anchorDateString = formatDateToLocal(anchorDate);
    return calculateDueDates(anchorDateString, installments);
  }, [anchorDate, installments]);

  return (
    <div className="grid gap-6">
      <div>
        <h3 className="text-lg font-medium">Payment Plan Selection</h3>
        <p className="text-muted-foreground text-sm">
          Choose your payment plan and set the anchor date for calculating due
          dates
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold tracking-tight">
            Payment Plan
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6">
          <div className="grid gap-2">
            <Label>Program</Label>
            <div className="text-muted-foreground text-sm">
              {programId ? `Program ID: ${programId}` : 'No program selected'}
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Template</Label>
            <Select
              value={selectedTemplateId}
              onValueChange={setSelectedTemplateId}
            >
              <SelectTrigger aria-label="Select payment template">
                <SelectValue placeholder="Select a template" />
              </SelectTrigger>
              <SelectContent>
                {templatesLoading ? (
                  <div className="text-muted-foreground px-2 py-1.5 text-sm">
                    Loading templates...
                  </div>
                ) : templatesError ? (
                  <div className="px-2 py-1.5 text-sm text-red-500">
                    Error loading templates
                  </div>
                ) : templates.length === 0 ? (
                  <div className="text-muted-foreground px-2 py-1.5 text-sm">
                    No templates available for this program
                  </div>
                ) : (
                  templates.map((t) => (
                    <SelectItem key={t.id} value={t.id as string}>
                      {t.name} {t.is_default ? '(Default)' : ''}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Anchor Date *</Label>
            <p className="text-muted-foreground text-sm">
              Select the date from which payment due dates will be calculated
            </p>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !anchorDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {anchorDate ? format(anchorDate, 'PPP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={anchorDate}
                  onSelect={setAnchorDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid gap-2">
            <Label>Schedule Preview</Label>
            <div className="w-full overflow-hidden rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="divide-x">
                    <TableHead>Name</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Due</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y">
                  {installmentsLoading ? (
                    <TableRow className="divide-x">
                      <TableCell colSpan={3}>
                        <p className="text-muted-foreground text-sm">
                          Loading installments...
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : preview.length === 0 ? (
                    <TableRow className="divide-x">
                      <TableCell colSpan={3}>
                        <p className="text-muted-foreground text-sm">
                          {!selectedTemplateId
                            ? 'Select a template to see schedule'
                            : !anchorDate
                              ? 'Select an anchor date to see schedule'
                              : 'No installments found'}
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    preview.map((row, idx) => (
                      <TableRow key={idx} className="divide-x">
                        <TableCell>{row.name}</TableCell>
                        <TableCell>${row.amount.toFixed(2)}</TableCell>
                        <TableCell>{row.due}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
