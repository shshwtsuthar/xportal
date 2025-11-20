'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import type { ApplicationFilters } from '@/src/hooks/useApplicationsFilters';
import { useGetAgents } from '@/src/hooks/useGetAgents';
import { useGetPrograms } from '@/src/hooks/useGetPrograms';
import { useGetProfilesMinimal } from '@/src/hooks/useGetProfilesMinimal';
import type { Database } from '@/database.types';

type ApplicationStatus = Database['public']['Enums']['application_status'];

const APPLICATION_STATUSES: { value: ApplicationStatus; label: string }[] = [
  { value: 'DRAFT', label: 'DRAFT' },
  { value: 'SUBMITTED', label: 'SUBMITTED' },
  { value: 'OFFER_GENERATED', label: 'OFFER GENERATED' },
  { value: 'OFFER_SENT', label: 'OFFER SENT' },
  { value: 'ACCEPTED', label: 'ACCEPTED' },
  { value: 'APPROVED', label: 'APPROVED' },
  { value: 'REJECTED', label: 'REJECTED' },
  { value: 'ARCHIVED', label: 'ARCHIVED (read only)' },
];

interface ApplicationsFilterProps {
  filters: ApplicationFilters;
  onApply: (filters: ApplicationFilters) => void;
  onReset: () => void;
  activeFilterCount: number;
}

export function ApplicationsFilter({
  filters,
  onApply,
  onReset,
  activeFilterCount,
}: ApplicationsFilterProps) {
  const [open, setOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState<ApplicationFilters>(filters);
  const [mounted, setMounted] = useState(false);

  // Ensure component only renders on client to avoid hydration mismatch
  React.useEffect(() => {
    setMounted(true);
  }, []);

  const { data: agents = [] } = useGetAgents();
  const { data: programs = [] } = useGetPrograms();
  const { data: profiles = [] } = useGetProfilesMinimal();

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

  const updateFilter = <K extends keyof ApplicationFilters>(
    key: K,
    value: ApplicationFilters[K]
  ) => {
    setLocalFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const updateDateRange = (
    key:
      | 'requestedStart'
      | 'proposedCommencement'
      | 'createdAt'
      | 'updatedAt'
      | 'offerGeneratedAt',
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

  const toggleStatus = (status: ApplicationStatus) => {
    const currentStatuses = localFilters.statuses || [];
    const newStatuses = currentStatuses.includes(status)
      ? currentStatuses.filter((s) => s !== status)
      : [...currentStatuses, status];

    updateFilter('statuses', newStatuses.length > 0 ? newStatuses : undefined);
  };

  const toggleArrayFilter = (
    key: 'agentIds' | 'programIds' | 'assignedToIds',
    value: string
  ) => {
    const currentValues = localFilters[key] || [];
    const newValues = currentValues.includes(value)
      ? currentValues.filter((v) => v !== value)
      : [...currentValues, value];

    updateFilter(key, newValues.length > 0 ? newValues : undefined);
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

  // Prevent hydration mismatch by only rendering Sheet after mount
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
          <SheetTitle>Filter Applications</SheetTitle>
          <SheetDescription>
            Use the filters below to narrow down your search results.
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
                  {APPLICATION_STATUSES.map((status) => (
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

            {/* People & Programs */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-medium">
                  People & Programs
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Agent */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Agent</Label>
                  <div className="max-h-40 space-y-2 overflow-y-auto">
                    {agents.map((agent) => (
                      <div
                        key={agent.id}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          id={`agent-${agent.id}`}
                          checked={
                            localFilters.agentIds?.includes(agent.id) || false
                          }
                          onCheckedChange={() =>
                            toggleArrayFilter('agentIds', agent.id)
                          }
                        />
                        <Label
                          htmlFor={`agent-${agent.id}`}
                          className="cursor-pointer text-sm font-normal"
                        >
                          {agent.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Program */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Program</Label>
                  <div className="max-h-40 space-y-2 overflow-y-auto">
                    {programs.map((program) => (
                      <div
                        key={program.id}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          id={`program-${program.id}`}
                          checked={
                            localFilters.programIds?.includes(program.id) ||
                            false
                          }
                          onCheckedChange={() =>
                            toggleArrayFilter('programIds', program.id)
                          }
                        />
                        <Label
                          htmlFor={`program-${program.id}`}
                          className="cursor-pointer text-sm font-normal"
                        >
                          {program.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Assigned To */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Assigned To</Label>
                  <div className="max-h-40 space-y-2 overflow-y-auto">
                    {profiles.map((profile) => (
                      <div
                        key={profile.id}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          id={`profile-${profile.id}`}
                          checked={
                            localFilters.assignedToIds?.includes(profile.id) ||
                            false
                          }
                          onCheckedChange={() =>
                            toggleArrayFilter('assignedToIds', profile.id)
                          }
                        />
                        <Label
                          htmlFor={`profile-${profile.id}`}
                          className="cursor-pointer text-sm font-normal"
                        >
                          {[profile.first_name, profile.last_name]
                            .filter(Boolean)
                            .join(' ') || 'Unnamed'}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Student Type */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-medium">
                  Student Type
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Select
                  value={
                    localFilters.isInternational === undefined
                      ? 'all'
                      : String(localFilters.isInternational)
                  }
                  onValueChange={(value) => {
                    if (value === 'all') {
                      updateFilter('isInternational', undefined);
                    } else {
                      updateFilter('isInternational', value === 'true');
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select student type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="false">Domestic</SelectItem>
                    <SelectItem value="true">International</SelectItem>
                  </SelectContent>
                </Select>
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
                  label="Requested Start Date"
                  value={localFilters.requestedStart}
                  onChange={(field, date) =>
                    updateDateRange('requestedStart', field, date)
                  }
                />

                <DateRangePicker
                  label="Proposed Commencement"
                  value={localFilters.proposedCommencement}
                  onChange={(field, date) =>
                    updateDateRange('proposedCommencement', field, date)
                  }
                />

                <DateRangePicker
                  label="Created Date"
                  value={localFilters.createdAt}
                  onChange={(field, date) =>
                    updateDateRange('createdAt', field, date)
                  }
                />

                <DateRangePicker
                  label="Updated Date"
                  value={localFilters.updatedAt}
                  onChange={(field, date) =>
                    updateDateRange('updatedAt', field, date)
                  }
                />

                <DateRangePicker
                  label="Offer Generated Date"
                  value={localFilters.offerGeneratedAt}
                  onChange={(field, date) =>
                    updateDateRange('offerGeneratedAt', field, date)
                  }
                />
              </CardContent>
            </Card>

            {/* Compliance & Requirements */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-medium">
                  Compliance & Requirements
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm">Payment Plan Template</Label>
                  <Select
                    value={localFilters.hasPaymentPlanTemplate || 'all'}
                    onValueChange={(value) => {
                      if (value === 'all') {
                        updateFilter('hasPaymentPlanTemplate', undefined);
                      } else {
                        updateFilter(
                          'hasPaymentPlanTemplate',
                          value as 'yes' | 'no'
                        );
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select option" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="yes">Has Template</SelectItem>
                      <SelectItem value="no">No Template</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Timetable</Label>
                  <Select
                    value={localFilters.hasTimetable || 'all'}
                    onValueChange={(value) => {
                      if (value === 'all') {
                        updateFilter('hasTimetable', undefined);
                      } else {
                        updateFilter('hasTimetable', value as 'yes' | 'no');
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select option" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="yes">Has Timetable</SelectItem>
                      <SelectItem value="no">No Timetable</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">
                    USI (Unique Student Identifier)
                  </Label>
                  <Select
                    value={localFilters.hasUSI || 'all'}
                    onValueChange={(value) => {
                      if (value === 'all') {
                        updateFilter('hasUSI', undefined);
                      } else {
                        updateFilter('hasUSI', value as 'yes' | 'no');
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select option" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="yes">Has USI</SelectItem>
                      <SelectItem value="no">No USI</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Passport Number</Label>
                  <Select
                    value={localFilters.hasPassport || 'all'}
                    onValueChange={(value) => {
                      if (value === 'all') {
                        updateFilter('hasPassport', undefined);
                      } else {
                        updateFilter('hasPassport', value as 'yes' | 'no');
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select option" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="yes">Has Passport</SelectItem>
                      <SelectItem value="no">No Passport</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
