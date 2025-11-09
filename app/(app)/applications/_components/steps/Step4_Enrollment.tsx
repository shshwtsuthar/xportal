'use client';

import { UseFormReturn } from 'react-hook-form';
import { ApplicationFormValues } from '@/lib/validators/application';
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
import { useGetTimetables } from '@/src/hooks/useGetTimetables';
import { EnrollmentPreview } from '../EnrollmentPreview';
import { OngoingSubjectPreview } from '../OngoingSubjectPreview';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
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
      proposed_commencement_date?: string;
      [key: string]: unknown; // Allow other fields for flexibility
    };

type Props = {
  form: UseFormReturn<FlexibleFormValues>;
};

export function EnrollmentStep({ form }: Props) {
  const { data: programs, isLoading } = useGetPrograms();

  // Use local state for immediate reactivity
  const [localProgramId, setLocalProgramId] = useState<string>('');
  const [localSelectedTimetableId, setLocalSelectedTimetableId] =
    useState<string>('');
  const [localSelectedDate, setLocalSelectedDate] = useState<Date | undefined>(
    undefined
  );

  const programId = form.watch('program_id') || localProgramId;
  const { data: timetables = [], isLoading: timetablesLoading } =
    useGetTimetables(programId);

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
  }, [form, localProgramId, localSelectedTimetableId, selectedDateString]);

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
      <div className="text-muted-foreground text-sm">
        Your Learning Plan will be frozen when you submit the application.
        Changes after submit aren&rsquo;t allowed.
      </div>
      <div>
        <h3 className="text-lg font-medium">Program Selection</h3>
        <p className="text-muted-foreground text-sm">
          Select the program you wish to apply for
        </p>
      </div>

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
                    form.setValue('timetable_id', '');
                    form.setValue('proposed_commencement_date', '');
                    setLocalSelectedTimetableId('');
                    setLocalSelectedDate(undefined);
                  }}
                >
                  <SelectTrigger>
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
                    setLocalSelectedTimetableId(value); // Update local state immediately
                  }}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        programId
                          ? 'Select a timetable'
                          : 'Select a program first'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {!programId ? (
                      <div className="text-muted-foreground px-2 py-1.5 text-sm">
                        Select a program first
                      </div>
                    ) : timetablesLoading ? (
                      <div className="text-muted-foreground px-2 py-1.5 text-sm">
                        Loading timetables...
                      </div>
                    ) : timetables.length === 0 ? (
                      <div className="text-muted-foreground px-2 py-1.5 text-sm">
                        No timetables for selected program (programId:{' '}
                        {programId})
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
            <CardTitle className="text-xl font-semibold tracking-tight">
              Commencement Date *
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              <Popover>
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
                    }}
                    disabled={disableDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <p className="text-muted-foreground text-sm">
                Only valid dates are selectable based on the selected plan and
                median cut-off rule.
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
    </div>
  );
}
