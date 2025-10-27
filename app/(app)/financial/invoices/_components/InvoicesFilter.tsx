'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Funnel, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { Database } from '@/database.types';
import type { InvoiceFilters } from '@/src/hooks/useInvoicesFilters';

type InvoiceStatus = Database['public']['Enums']['invoice_status'];

const INVOICE_STATUSES: { value: InvoiceStatus; label: string }[] = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'SENT', label: 'Sent' },
  { value: 'OVERDUE', label: 'Overdue' },
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'PAID', label: 'Paid' },
  { value: 'VOID', label: 'Void' },
];

interface Props {
  filters: InvoiceFilters;
  onApply: (filters: InvoiceFilters) => void;
  onReset: () => void;
  activeFilterCount: number;
}

export function InvoicesFilter({
  filters,
  onApply,
  onReset,
  activeFilterCount,
}: Props) {
  const [open, setOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState<InvoiceFilters>(filters);

  const handleApply = () => {
    onApply(localFilters);
    setOpen(false);
    toast.success('Filters applied successfully');
  };

  const handleReset = () => {
    setLocalFilters({});
    onReset();
    setOpen(false);
    toast.success('Filters reset');
  };

  React.useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const updateFilter = <K extends keyof InvoiceFilters>(
    key: K,
    value: InvoiceFilters[K]
  ) => {
    setLocalFilters((prev) => ({ ...prev, [key]: value }));
  };

  const updateDateRange = (
    key: 'issueDate' | 'dueDate',
    field: 'from' | 'to',
    value: string | undefined
  ) => {
    setLocalFilters((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
  };

  const updateNumberRange = (
    key: 'amountDue' | 'amountPaid' | 'balance' | 'overdueDays',
    field: 'min' | 'max',
    value?: number
  ) => {
    setLocalFilters((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
  };

  const toggleStatus = (status: InvoiceStatus) => {
    const current = localFilters.statuses || [];
    const next = current.includes(status)
      ? current.filter((s) => s !== status)
      : [...current, status];
    updateFilter('statuses', next.length ? next : undefined);
  };

  const DateRange = ({
    label,
    value,
    onChange,
  }: {
    label: string;
    value: { from?: string; to?: string } | undefined;
    onChange: (field: 'from' | 'to', date: string | undefined) => void;
  }) => (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="grid grid-cols-2 gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'w-full justify-start text-left font-normal',
                !value?.from && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {value?.from
                ? format(new Date(value.from), 'dd MMM yyyy')
                : 'From'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={value?.from ? new Date(value.from) : undefined}
              onSelect={(date) =>
                onChange('from', date ? format(date, 'yyyy-MM-dd') : undefined)
              }
              initialFocus
            />
          </PopoverContent>
        </Popover>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'w-full justify-start text-left font-normal',
                !value?.to && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {value?.to ? format(new Date(value.to), 'dd MMM yyyy') : 'To'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={value?.to ? new Date(value.to) : undefined}
              onSelect={(date) =>
                onChange('to', date ? format(date, 'yyyy-MM-dd') : undefined)
              }
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );

  const NumberRange = ({
    label,
    value,
    onChange,
    suffix,
  }: {
    label: string;
    value: { min?: number; max?: number } | undefined;
    onChange: (field: 'min' | 'max', v?: number) => void;
    suffix?: string;
  }) => (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="grid grid-cols-2 gap-2">
        <input
          type="number"
          className="border-input bg-background text-foreground placeholder:text-muted-foreground ring-offset-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-1 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          placeholder={`Min${suffix ? ` (${suffix})` : ''}`}
          value={value?.min ?? ''}
          onChange={(e) =>
            onChange(
              'min',
              e.target.value === '' ? undefined : Number(e.target.value)
            )
          }
          aria-label={`${label} min`}
        />
        <input
          type="number"
          className="border-input bg-background text-foreground placeholder:text-muted-foreground ring-offset-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-1 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          placeholder={`Max${suffix ? ` (${suffix})` : ''}`}
          value={value?.max ?? ''}
          onChange={(e) =>
            onChange(
              'max',
              e.target.value === '' ? undefined : Number(e.target.value)
            )
          }
          aria-label={`${label} max`}
        />
      </div>
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="relative"
          aria-label="Open filters"
        >
          <Funnel className="h-4 w-4" />
          {activeFilterCount > 0 && (
            <Badge
              variant="secondary"
              className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full p-0 text-xs"
            >
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="sm:max-w-md md:max-w-lg">
        <SheetHeader>
          <SheetTitle>Filter Invoices</SheetTitle>
          <SheetDescription>
            Use the filters below to narrow invoices.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="space-y-4">
            {/* Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-medium">Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {INVOICE_STATUSES.map((status) => (
                    <div
                      key={status.value}
                      className="flex items-center space-x-2"
                    >
                      <Checkbox
                        id={`status-${status.value}`}
                        checked={
                          localFilters.statuses?.includes(status.value) || false
                        }
                        onCheckedChange={() => toggleStatus(status.value)}
                      />
                      <Label
                        htmlFor={`status-${status.value}`}
                        className="cursor-pointer text-sm font-normal"
                      >
                        {status.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Dates */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-medium">Dates</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <DateRange
                  label="Issue Date"
                  value={localFilters.issueDate}
                  onChange={(field, date) =>
                    updateDateRange('issueDate', field, date)
                  }
                />
                <DateRange
                  label="Due Date"
                  value={localFilters.dueDate}
                  onChange={(field, date) =>
                    updateDateRange('dueDate', field, date)
                  }
                />
              </CardContent>
            </Card>

            {/* Amounts */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-medium">
                  Amounts ($)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <NumberRange
                  label="Amount Due"
                  value={localFilters.amountDue}
                  onChange={(f, v) => updateNumberRange('amountDue', f, v)}
                  suffix="$"
                />
                <NumberRange
                  label="Amount Paid"
                  value={localFilters.amountPaid}
                  onChange={(f, v) => updateNumberRange('amountPaid', f, v)}
                  suffix="$"
                />
                <NumberRange
                  label="Balance"
                  value={localFilters.balance}
                  onChange={(f, v) => updateNumberRange('balance', f, v)}
                  suffix="$"
                />
              </CardContent>
            </Card>

            {/* Communications & Overdue */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-medium">Other</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-sm">Emailed</Label>
                    <select
                      className="border-input bg-background text-foreground ring-offset-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm focus-visible:ring-1 focus-visible:outline-none"
                      value={localFilters.emailed || 'all'}
                      onChange={(e) =>
                        updateFilter(
                          'emailed',
                          e.target.value === 'all'
                            ? undefined
                            : (e.target.value as 'yes' | 'no')
                        )
                      }
                      aria-label="Emailed filter"
                    >
                      <option value="all">All</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Has PDF</Label>
                    <select
                      className="border-input bg-background text-foreground ring-offset-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm focus-visible:ring-1 focus-visible:outline-none"
                      value={localFilters.hasPdf || 'all'}
                      onChange={(e) =>
                        updateFilter(
                          'hasPdf',
                          e.target.value === 'all'
                            ? undefined
                            : (e.target.value as 'yes' | 'no')
                        )
                      }
                      aria-label="Has PDF filter"
                    >
                      <option value="all">All</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </div>
                </div>
                <NumberRange
                  label="Overdue Days"
                  value={localFilters.overdueDays}
                  onChange={(f, v) => updateNumberRange('overdueDays', f, v)}
                />
              </CardContent>
            </Card>
          </div>
        </div>

        <SheetFooter className="gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={handleReset}>
            Reset
          </Button>
          <Button onClick={handleApply}>Apply Filters</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
