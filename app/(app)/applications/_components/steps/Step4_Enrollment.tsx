'use client';

import { UseFormReturn } from 'react-hook-form';
import { z } from 'zod';
import { draftApplicationSchema } from '@/src/schemas';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useGetPrograms } from '@/src/hooks/useGetPrograms';
import { useGetTimetablesByGroupAndLocation } from '@/src/hooks/useGetTimetablesByGroupAndLocation';
import { useGetLocations } from '@/src/hooks/useGetLocations';
import { useGetGroupsByLocation } from '@/src/hooks/useGetGroupsByLocation';
import { EnrollmentPreview } from '../EnrollmentPreview';
import { OngoingSubjectPreview } from '../OngoingSubjectPreview';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { CalendarIcon, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useState } from 'react';
import { formatDateToLocal, getTodayInAustraliaSydney } from '@/lib/utils/date';
import {
  isGroupFull,
  isGroupNearFull,
  getGroupCapacityAriaLabel,
} from '@/lib/utils/enrollment-utils';

// Type inferred from the draft schema (all fields optional)
type DraftApplicationFormValues = z.infer<typeof draftApplicationSchema>;

type Props = {
  form: UseFormReturn<DraftApplicationFormValues>;
};

export function EnrollmentStep({ form }: Props) {
  const { data: programs, isLoading, error: programsError } = useGetPrograms();
  const {
    data: locations = [],
    isLoading: locationsLoading,
    error: locationsError,
  } = useGetLocations();

  // Use form state directly - single source of truth
  const programId = form.watch('program_id') as string | undefined;
  const selectedLocationId = form.watch('preferred_location_id') as
    | string
    | undefined;
  const selectedGroupId = form.watch('group_id') as string | undefined;
  const selectedTimetableId = form.watch('timetable_id') as string | undefined;
  const selectedDateString = form.watch('proposed_commencement_date') as
    | string
    | undefined;

  // Get groups for the selected location
  const {
    data: groups = [],
    isLoading: groupsLoading,
    error: groupsError,
  } = useGetGroupsByLocation(programId, selectedLocationId);

  // Get timetables filtered by group and location
  const {
    data: timetables = [],
    isLoading: timetablesLoading,
    error: timetablesError,
  } = useGetTimetablesByGroupAndLocation(
    programId,
    selectedGroupId,
    selectedLocationId
  );

  const selectedDate = selectedDateString
    ? new Date(selectedDateString)
    : undefined;
  const [isDateOpen, setIsDateOpen] = useState(false);

  const disableDate = (date: Date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const today = getTodayInAustraliaSydney();

    // Disable dates before today (in Australia/Sydney timezone)
    if (d < today) return true;

    // Allow any future date for timetable-based enrollment
    return false;
  };

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold tracking-tight">
            Programs
          </CardTitle>
          <CardDescription>
            Select the program you wish to apply for
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          <div className="grid gap-4">
            <FormField
              control={form.control}
              name="program_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Program *</FormLabel>
                  <FormControl>
                    <Select
                      value={field.value || ''}
                      onValueChange={(value) => {
                        field.onChange(value);
                        // Clear dependent selections on program change
                        form.setValue('preferred_location_id', undefined);
                        form.setValue('group_id', undefined);
                        form.setValue('timetable_id', undefined);
                        form.setValue('proposed_commencement_date', undefined);
                      }}
                      disabled={isLoading}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a program" />
                      </SelectTrigger>
                      <SelectContent>
                        {programsError ? (
                          <div className="text-destructive px-2 py-1.5 text-sm">
                            Error loading programs. Please try again.
                          </div>
                        ) : isLoading ? (
                          <div className="text-muted-foreground px-2 py-1.5 text-sm">
                            Loading programs...
                          </div>
                        ) : (programs ?? []).length === 0 ? (
                          <div className="text-muted-foreground px-2 py-1.5 text-sm">
                            No programs available
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
              name="preferred_location_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preferred Location *</FormLabel>
                  <FormControl>
                    <Select
                      value={field.value || ''}
                      onValueChange={(value) => {
                        field.onChange(value);
                        // Clear dependent selections on location change
                        form.setValue('group_id', undefined);
                        form.setValue('timetable_id', undefined);
                        form.setValue('proposed_commencement_date', undefined);
                      }}
                      disabled={!programId || locationsLoading}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue
                          placeholder={
                            !programId
                              ? 'Select a program first'
                              : locationsLoading
                                ? 'Loading locations...'
                                : 'Select a location'
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {locationsError ? (
                          <div className="text-destructive px-2 py-1.5 text-sm">
                            Error loading locations. Please try again.
                          </div>
                        ) : locationsLoading ? (
                          <div className="text-muted-foreground px-2 py-1.5 text-sm">
                            Loading locations...
                          </div>
                        ) : locations.length === 0 ? (
                          <div className="text-muted-foreground px-2 py-1.5 text-sm">
                            No locations available
                          </div>
                        ) : (
                          locations.map((location) => (
                            <SelectItem
                              key={location.id}
                              value={location.id as string}
                            >
                              {location.name}
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
              name="group_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Group *</FormLabel>
                  <FormControl>
                    <Select
                      value={field.value || ''}
                      onValueChange={(value: string) => {
                        field.onChange(value);
                        // Clear dependent selections on group change
                        form.setValue('timetable_id', undefined);
                        form.setValue('proposed_commencement_date', undefined);
                      }}
                      disabled={!selectedLocationId || groupsLoading}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue
                          placeholder={
                            !selectedLocationId
                              ? 'Select a location first'
                              : groupsLoading
                                ? 'Loading groups...'
                                : 'Select a group'
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {!selectedLocationId ? (
                          <div className="text-muted-foreground px-2 py-1.5 text-sm">
                            Select a location first
                          </div>
                        ) : groupsError ? (
                          <div className="text-destructive px-2 py-1.5 text-sm">
                            Error loading groups. Please try again.
                          </div>
                        ) : groupsLoading ? (
                          <div className="text-muted-foreground px-2 py-1.5 text-sm">
                            Loading groups...
                          </div>
                        ) : groups.length === 0 ? (
                          <div className="text-muted-foreground px-2 py-1.5 text-sm">
                            No groups available at this location
                          </div>
                        ) : (
                          groups.map((group) => {
                            const isFull = isGroupFull(
                              group.current_enrollment_count,
                              group.max_capacity
                            );
                            const isNearFull = isGroupNearFull(
                              group.current_enrollment_count,
                              group.max_capacity
                            );

                            return (
                              <TooltipProvider key={group.id}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <SelectItem
                                      value={group.id as string}
                                      disabled={isFull}
                                      aria-label={getGroupCapacityAriaLabel(
                                        group.name,
                                        group.current_enrollment_count,
                                        group.max_capacity
                                      )}
                                      className={cn(
                                        isFull &&
                                          'cursor-not-allowed opacity-50'
                                      )}
                                    >
                                      <div className="flex w-full items-center justify-between gap-4">
                                        <span className="flex-1">
                                          {group.name}
                                        </span>
                                        <Badge
                                          variant={
                                            isFull
                                              ? 'destructive'
                                              : isNearFull
                                                ? 'outline'
                                                : 'secondary'
                                          }
                                          className="ml-2 shrink-0"
                                        >
                                          {group.current_enrollment_count}/
                                          {group.max_capacity}
                                        </Badge>
                                      </div>
                                    </SelectItem>
                                  </TooltipTrigger>
                                  {isFull && (
                                    <TooltipContent>
                                      <div className="flex items-center gap-2">
                                        <AlertCircle className="h-4 w-4" />
                                        <span>
                                          This group is at full capacity (
                                          {group.current_enrollment_count}/
                                          {group.max_capacity})
                                        </span>
                                      </div>
                                    </TooltipContent>
                                  )}
                                </Tooltip>
                              </TooltipProvider>
                            );
                          })
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
              name="timetable_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Timetable *</FormLabel>
                  <FormControl>
                    <Select
                      value={field.value || ''}
                      onValueChange={(value) => {
                        field.onChange(value);
                      }}
                      disabled={!selectedGroupId || timetablesLoading}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue
                          placeholder={
                            !selectedGroupId
                              ? 'Select a group first'
                              : timetablesLoading
                                ? 'Loading timetables...'
                                : 'Select a timetable'
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {!selectedGroupId ? (
                          <div className="text-muted-foreground px-2 py-1.5 text-sm">
                            Select a group first
                          </div>
                        ) : timetablesError ? (
                          <div className="text-destructive px-2 py-1.5 text-sm">
                            Error loading timetables. Please try again.
                          </div>
                        ) : timetablesLoading ? (
                          <div className="text-muted-foreground px-2 py-1.5 text-sm">
                            Loading timetables...
                          </div>
                        ) : timetables.length === 0 ? (
                          <div className="text-muted-foreground px-2 py-1.5 text-sm">
                            No timetables available for this group and location
                          </div>
                        ) : (
                          timetables.map((timetable) => (
                            <SelectItem
                              key={timetable.id}
                              value={timetable.id as string}
                            >
                              {timetable.name}
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
          </div>

          {!!selectedTimetableId && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Commencement Date *</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2">
                  <Popover open={isDateOpen} onOpenChange={setIsDateOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !selectedDate && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate
                          ? format(selectedDate, 'PPP')
                          : 'Pick commencement date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(d) => {
                          if (!d) return;
                          const iso = formatDateToLocal(d);
                          form.setValue('proposed_commencement_date', iso);
                          setIsDateOpen(false);
                        }}
                        disabled={disableDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <p className="text-muted-foreground text-sm">
                    Only valid dates are selectable based on the selected plan
                    and median cut-off rule.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Ongoing Subject Card */}
          <OngoingSubjectPreview timetableId={selectedTimetableId} />

          {/* Enrollment Preview */}
          <EnrollmentPreview
            timetableId={selectedTimetableId}
            commencementDate={selectedDate}
          />
        </CardContent>
      </Card>
    </div>
  );
}
