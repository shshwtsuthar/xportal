'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
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
import { Funnel } from 'lucide-react';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { StudentFilters } from '@/src/hooks/useStudentsFilters';
import type { Database } from '@/database.types';

type StudentStatus = Database['public']['Enums']['student_status'];

const STUDENT_STATUSES: { value: StudentStatus; label: string }[] = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'WITHDRAWN', label: 'Withdrawn' },
];

interface StudentsFilterProps {
  filters: StudentFilters;
  onApply: (filters: StudentFilters) => void;
  onReset: () => void;
  activeFilterCount: number;
}

export function StudentsFilter({
  filters,
  onApply,
  onReset,
  activeFilterCount,
}: StudentsFilterProps) {
  const [open, setOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState<StudentFilters>(filters);
  const [mounted, setMounted] = useState(false);

  // Ensure component only renders on client to avoid hydration mismatch
  React.useEffect(() => {
    setMounted(true);
  }, []);

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

  // Update local filters when external filters change
  React.useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const updateFilter = <K extends keyof StudentFilters>(
    key: K,
    value: StudentFilters[K]
  ) => {
    setLocalFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const updateDateRange = (
    key: 'createdAt',
    field: 'from' | 'to',
    value: string | undefined
  ) => {
    setLocalFilters((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value,
      },
    }));
  };

  const toggleStatus = (status: StudentStatus) => {
    const currentStatuses = localFilters.statuses || [];
    const newStatuses = currentStatuses.includes(status)
      ? currentStatuses.filter((s) => s !== status)
      : [...currentStatuses, status];

    updateFilter('statuses', newStatuses.length > 0 ? newStatuses : undefined);
  };

  const DateRangePicker = ({
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

  // Prevent hydration mismatch by only rendering Sheet on client
  if (!mounted) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="relative"
        aria-label="Open filters"
        disabled
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
    );
  }

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
          <SheetTitle>Filter Students</SheetTitle>
          <SheetDescription>
            Use the filters below to narrow down your search results.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="space-y-4">
            {/* Search */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-medium">Search</CardTitle>
              </CardHeader>
              <CardContent>
                <Input
                  placeholder="Search by name or email"
                  value={localFilters.search || ''}
                  onChange={(e) =>
                    updateFilter('search', e.target.value || undefined)
                  }
                />
              </CardContent>
            </Card>

            {/* Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-medium">Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {STUDENT_STATUSES.map((status) => (
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

            {/* Date Ranges */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-medium">
                  Date Ranges
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <DateRangePicker
                  label="Created Date"
                  value={localFilters.createdAt}
                  onChange={(field, date) =>
                    updateDateRange('createdAt', field, date)
                  }
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
