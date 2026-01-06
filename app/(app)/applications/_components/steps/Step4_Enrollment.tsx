'use client';

import { UseFormReturn } from 'react-hook-form';
import { ApplicationFormValues } from '@/src/lib/applicationSchema';
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
import { useEffect, useState } from 'react';
import { formatDateToLocal } from '@/lib/utils/date';

// Union type that can handle both draft and final application forms
type FlexibleFormValues =
  | ApplicationFormValues
  | {
      email?: string; // Optional in draftApplicationSchema
      program_id?: string;
      timetable_id?: string;
      preferred_location_id?: string;
      proposed_commencement_date?: string;
      [key: string]: unknown; // Allow other fields for flexibility
    };

type Props = {
  form: UseFormReturn<FlexibleFormValues>;
};

export function EnrollmentStep({ form }: Props) {
  const { data: programs, isLoading } = useGetPrograms();
  const { data: locations = [], isLoading: locationsLoading } =
    useGetLocations();

  // Use local state for immediate reactivity
  const [localProgramId, setLocalProgramId] = useState<string>('');
  const [localSelectedLocationId, setLocalSelectedLocationId] =
    useState<string>('');
  const [localSelectedGroupId, setLocalSelectedGroupId] = useState<string>('');
  const [localSelectedTimetableId, setLocalSelectedTimetableId] =
    useState<string>('');
  const [localSelectedDate, setLocalSelectedDate] = useState<Date | undefined>(
    undefined
  );

  const programId = form.watch('program_id') || localProgramId;
  const selectedLocationId =
    (form.watch('preferred_location_id') as string) || localSelectedLocationId;
  const selectedGroupId =
    (form.watch('group_id') as string) || localSelectedGroupId;

  // Get groups for the selected location
  const { data: groups = [], isLoading: groupsLoading } =
    useGetGroupsByLocation(programId, selectedLocationId);

  // Get timetables filtered by group and location
  const { data: timetables = [], isLoading: timetablesLoading } =
    useGetTimetablesByGroupAndLocation(
      programId,
      selectedGroupId,
      selectedLocationId
    );

  const selectedTimetableId =
    form.watch('timetable_id') || localSelectedTimetableId;

  // Debug logging
  console.log('EnrollmentStep Debug:', {
    programId,
    programIdType: typeof programId,
    programIdTruthy: !!programId,
    timetablesCount: timetables.length,
    timetablesLoading,
    selectedTimetableId,
    selectedTimetableIdType: typeof selectedTimetableId,
    selectedTimetableIdTruthy: !!selectedTimetableId,
  });

  // Do not auto-clear timetable/date on initial load; we clear explicitly on user-driven program change

  // Sync local program state with form when form is reset/loaded
  useEffect(() => {
    const formProgramId = form.getValues('program_id');
    if (formProgramId && formProgramId !== localProgramId) {
      console.log(
        'Syncing local program state with form value:',
        formProgramId
      );
      setLocalProgramId(formProgramId);
    }
  }, [form, localProgramId]);

  // Commencement date selection helpers
  const selectedDateString = form.watch('proposed_commencement_date') as
    | string
    | undefined;
  const selectedDate =
    localSelectedDate ||
    (selectedDateString ? new Date(selectedDateString) : undefined);
  const [isDateOpen, setIsDateOpen] = useState(false);

  // Watch for changes in programId
  useEffect(() => {
    console.log('programId changed to:', programId);
  }, [programId]);

  // Watch for changes in selectedTimetableId
  useEffect(() => {
    console.log('selectedTimetableId changed to:', selectedTimetableId);
  }, [selectedTimetableId]);

  // Sync local state with form when form is reset/loaded
  useEffect(() => {
    const formProgramId = form.getValues('program_id');
    if (formProgramId && formProgramId !== localProgramId) {
      console.log(
        'Syncing local program state with form value:',
        formProgramId
      );
      setLocalProgramId(formProgramId);
    }

    const formTimetableId = form.getValues('timetable_id');
    if (formTimetableId && formTimetableId !== localSelectedTimetableId) {
      console.log(
        'Syncing local timetable state with form value:',
        formTimetableId
      );
      setLocalSelectedTimetableId(formTimetableId);
    }

    const formDateString = form.getValues('proposed_commencement_date');
    if (
      formDateString &&
      typeof formDateString === 'string' &&
      formDateString !== selectedDateString
    ) {
      console.log('Syncing local date state with form value:', formDateString);
      try {
        setLocalSelectedDate(new Date(formDateString));
      } catch {
        console.error('Invalid date string:', formDateString);
      }
    }

    const formLocationId = form.getValues('preferred_location_id');
    if (
      formLocationId &&
      typeof formLocationId === 'string' &&
      formLocationId !== localSelectedLocationId
    ) {
      console.log(
        'Syncing local location state with form value:',
        formLocationId
      );
      setLocalSelectedLocationId(formLocationId);
    }
  }, [
    form,
    localProgramId,
    localSelectedTimetableId,
    localSelectedLocationId,
    selectedDateString,
  ]);

  // Note: Preview logic is now handled by EnrollmentPreview component

  const disableDate = (date: Date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Disable dates before today
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
                      value={field.value || localProgramId}
                      onValueChange={(value) => {
                        console.log('Program selected:', value);
                        field.onChange(value);
                        form.setValue('program_id', value);
                        setLocalProgramId(value); // Update local state immediately
                        // Explicitly clear dependent selections on program change
                        form.setValue('preferred_location_id', '');
                        form.setValue('group_id', '');
                        form.setValue('timetable_id', '');
                        form.setValue('proposed_commencement_date', '');
                        setLocalSelectedLocationId('');
                        setLocalSelectedGroupId('');
                        setLocalSelectedTimetableId('');
                        setLocalSelectedDate(undefined);
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a program" />
                      </SelectTrigger>
                      <SelectContent>
                        {isLoading ? (
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
                      value={field.value || localSelectedLocationId}
                      onValueChange={(value) => {
                        console.log('Location selected:', value);
                        field.onChange(value);
                        form.setValue('preferred_location_id', value);
                        setLocalSelectedLocationId(value);
                        // Clear dependent selections on location change
                        form.setValue('group_id', '');
                        form.setValue('timetable_id', '');
                        form.setValue('proposed_commencement_date', '');
                        setLocalSelectedGroupId('');
                        setLocalSelectedTimetableId('');
                        setLocalSelectedDate(undefined);
                      }}
                      disabled={!programId}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue
                          placeholder={
                            programId
                              ? 'Select a location'
                              : 'Select a program first'
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {locationsLoading ? (
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
                      value={(field.value as string) || localSelectedGroupId}
                      onValueChange={(value: string) => {
                        console.log('Group selected:', value);
                        field.onChange(value);
                        form.setValue('group_id', value);
                        setLocalSelectedGroupId(value);
                        // Clear dependent selections on group change
                        form.setValue('timetable_id', '');
                        form.setValue('proposed_commencement_date', '');
                        setLocalSelectedTimetableId('');
                        setLocalSelectedDate(undefined);
                      }}
                      disabled={!selectedLocationId}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue
                          placeholder={
                            selectedLocationId
                              ? 'Select a group'
                              : 'Select a location first'
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {!selectedLocationId ? (
                          <div className="text-muted-foreground px-2 py-1.5 text-sm">
                            Select a location first
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
                            const isFull =
                              group.current_enrollment_count >=
                              group.max_capacity;
                            const isNearFull =
                              group.current_enrollment_count >=
                              group.max_capacity * 0.9;

                            return (
                              <TooltipProvider key={group.id}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <SelectItem
                                      value={group.id as string}
                                      disabled={isFull}
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
                      value={field.value || localSelectedTimetableId}
                      onValueChange={(value) => {
                        console.log('Timetable selected:', value);
                        field.onChange(value);
                        form.setValue('timetable_id', value);
                        setLocalSelectedTimetableId(value);
                      }}
                      disabled={!selectedGroupId}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue
                          placeholder={
                            selectedGroupId
                              ? 'Select a timetable'
                              : 'Select a group first'
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {!selectedGroupId ? (
                          <div className="text-muted-foreground px-2 py-1.5 text-sm">
                            Select a group first
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
                          console.log('Date selected:', d);
                          if (!d) return;
                          const iso = formatDateToLocal(d);
                          console.log('Setting date to:', iso);
                          form.setValue('proposed_commencement_date', iso);
                          setLocalSelectedDate(d); // Update local state immediately
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
