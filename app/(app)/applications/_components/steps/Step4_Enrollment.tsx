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
import { useGetProgramPlans } from '@/src/hooks/useGetProgramPlans';
import { useGetProgramPlanSubjects } from '@/src/hooks/useGetProgramPlanSubjects';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { useEffect, useMemo, useState } from 'react';
import { formatDateToLocal } from '@/lib/utils/date';

// Union type that can handle both draft and final application forms
type FlexibleFormValues =
  | ApplicationFormValues
  | {
      program_id?: string;
      program_plan_id?: string;
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
  const [localSelectedPlanId, setLocalSelectedPlanId] = useState<string>('');
  const [localSelectedDate, setLocalSelectedDate] = useState<Date | undefined>(
    undefined
  );

  const programId = form.watch('program_id') || localProgramId;
  const { data: plans = [], isLoading: plansLoading } =
    useGetProgramPlans(programId);

  const selectedPlanId = form.watch('program_plan_id') || localSelectedPlanId;
  const { data: planSubjects = [], isLoading: psubLoading } =
    useGetProgramPlanSubjects(selectedPlanId);

  // Debug logging
  console.log('EnrollmentStep Debug:', {
    programId,
    programIdType: typeof programId,
    programIdTruthy: !!programId,
    plansCount: plans.length,
    plansLoading,
    selectedPlanId,
    selectedPlanIdType: typeof selectedPlanId,
    selectedPlanIdTruthy: !!selectedPlanId,
    planSubjectsCount: planSubjects.length,
    psubLoading,
  });

  // Clear program plan selection when program changes
  useEffect(() => {
    if (programId) {
      console.log('Clearing program plan due to program change');
      form.setValue('program_plan_id', '');
      form.setValue('proposed_commencement_date', '');
      setLocalSelectedPlanId(''); // Clear local state too
      setLocalSelectedDate(undefined); // Clear local date too
    }
  }, [programId, form]);

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

  // Watch for changes in selectedPlanId
  useEffect(() => {
    console.log('selectedPlanId changed to:', selectedPlanId);
  }, [selectedPlanId]);

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

    const formPlanId = form.getValues('program_plan_id');
    if (formPlanId && formPlanId !== localSelectedPlanId) {
      console.log('Syncing local plan state with form value:', formPlanId);
      setLocalSelectedPlanId(formPlanId);
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
      } catch (error) {
        console.error('Invalid date string:', formDateString);
      }
    }
  }, [form, localProgramId, localSelectedPlanId, selectedDateString]);

  // Build enrollment preview: current subject (if any) + next 2 upcoming subjects; never include past
  const { currentSubject, upcomingSubjects, previewSubjects } = useMemo(() => {
    console.log(
      'Preview calculation - planSubjects:',
      planSubjects.length,
      'data:',
      planSubjects
    );
    if (!planSubjects || planSubjects.length === 0) {
      console.log('Preview calculation - no subjects, returning empty');
      return {
        currentSubject: undefined,
        upcomingSubjects: [] as typeof planSubjects,
        previewSubjects: [] as typeof planSubjects,
      };
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    console.log('Preview calculation - today:', today.toISOString());

    const sorted = [...planSubjects].sort(
      (a, b) =>
        new Date(a.start_date as string).getTime() -
        new Date(b.start_date as string).getTime()
    );
    console.log(
      'Preview calculation - sorted subjects:',
      sorted.map((s) => ({
        id: s.id,
        start_date: s.start_date,
        end_date: s.end_date,
        name: 'subject', // We don't have subject name in this table
      }))
    );

    const current = sorted.find((s) => {
      const start = new Date(s.start_date as string);
      const end = new Date(s.end_date as string);
      const isCurrent = today >= start && today <= end;
      console.log(
        `Preview calculation - checking subject ${s.id}: start=${start.toISOString()}, end=${end.toISOString()}, isCurrent=${isCurrent}`
      );
      return isCurrent;
    });
    console.log('Preview calculation - current subject:', current?.id);

    const upcoming = sorted
      .filter((s) => new Date(s.start_date as string) > today)
      .slice(0, 3);
    console.log(
      'Preview calculation - upcoming subjects:',
      upcoming.map((s) => s.id)
    );

    const preview: typeof planSubjects = [];
    if (current) preview.push(current);
    for (const s of upcoming) {
      if (!current || s.id !== current.id) preview.push(s);
    }
    console.log(
      'Preview calculation - final preview:',
      preview.map((s) => s.id)
    );
    return {
      currentSubject: current,
      upcomingSubjects: upcoming,
      previewSubjects: preview,
    };
  }, [planSubjects]);

  const nextSubject = useMemo(() => {
    if (upcomingSubjects.length > 0) return upcomingSubjects[0];
    // If no upcoming by filter, try to find strictly next by start_date >= today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const future = [...planSubjects]
      .filter((s) => new Date(s.start_date as string) >= today)
      .sort(
        (a, b) =>
          new Date(a.start_date as string).getTime() -
          new Date(b.start_date as string).getTime()
      );
    return future[0];
  }, [upcomingSubjects, planSubjects]);

  const disableDate = (date: Date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Never allow past dates
    if (d < today) return true;

    // If we have a current subject and we are before/equal to its median, allow dates up to median
    if (currentSubject) {
      const currentMedian = new Date(currentSubject.median_date as string);
      currentMedian.setHours(0, 0, 0, 0);
      const currentEnd = new Date(currentSubject.end_date as string);
      currentEnd.setHours(0, 0, 0, 0);

      const inCurrentWindow = d >= today && d <= currentMedian;
      if (today <= currentEnd && today <= currentMedian) {
        // During current subject before cutoff: allow [today, median]
        if (inCurrentWindow) return false;
        // Otherwise, only allow from next subject start to its median
        if (nextSubject) {
          const nextStart = new Date(nextSubject.start_date as string);
          nextStart.setHours(0, 0, 0, 0);
          const nextMedian = new Date(nextSubject.median_date as string);
          nextMedian.setHours(0, 0, 0, 0);
          return !(d >= nextStart && d <= nextMedian);
        }
        return true;
      }
    }

    // Otherwise (no current or past the cutoff), allow from next subject start to its median
    if (nextSubject) {
      const nextStart = new Date(nextSubject.start_date as string);
      nextStart.setHours(0, 0, 0, 0);
      const nextMedian = new Date(nextSubject.median_date as string);
      nextMedian.setHours(0, 0, 0, 0);
      return !(d >= nextStart && d <= nextMedian);
    }

    // If no information, disable selection
    return true;
  };

  return (
    <div className="grid gap-6">
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
          name="program_plan_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Program Plan *</FormLabel>
              <FormControl>
                <Select
                  value={field.value || localSelectedPlanId}
                  onValueChange={(value) => {
                    console.log('Program plan selected:', value);
                    field.onChange(value);
                    form.setValue('program_plan_id', value);
                    setLocalSelectedPlanId(value); // Update local state immediately
                  }}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        programId ? 'Select a plan' : 'Select a program first'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {!programId ? (
                      <div className="text-muted-foreground px-2 py-1.5 text-sm">
                        Select a program first
                      </div>
                    ) : plansLoading ? (
                      <div className="text-muted-foreground px-2 py-1.5 text-sm">
                        Loading plans...
                      </div>
                    ) : plans.length === 0 ? (
                      <div className="text-muted-foreground px-2 py-1.5 text-sm">
                        No plans for selected program (programId: {programId})
                      </div>
                    ) : (
                      plans.map((pl) => (
                        <SelectItem key={pl.id} value={pl.id as string}>
                          {pl.name}
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

      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold tracking-tight">
            Enrollment Preview
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!selectedPlanId ? (
            <div className="text-muted-foreground text-sm">
              Select a program plan to preview schedule
            </div>
          ) : psubLoading ? (
            <div className="text-muted-foreground text-sm">
              Loading schedule...
            </div>
          ) : previewSubjects.length === 0 ? (
            <div className="text-muted-foreground text-sm">
              No scheduled subjects in this plan
            </div>
          ) : (
            <div className="grid gap-3">
              <Table>
                <TableHeader>
                  <TableRow className="divide-x">
                    <TableHead>Start</TableHead>
                    <TableHead>Median</TableHead>
                    <TableHead>End</TableHead>
                    <TableHead>Prerequisite</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y">
                  {previewSubjects.map((s) => (
                    <TableRow key={s.id as string} className="divide-x">
                      <TableCell>
                        {format(new Date(s.start_date as string), 'PPP')}
                      </TableCell>
                      <TableCell>
                        {format(new Date(s.median_date as string), 'PPP')}
                      </TableCell>
                      <TableCell>
                        {format(new Date(s.end_date as string), 'PPP')}
                      </TableCell>
                      <TableCell>{s.is_prerequisite ? 'Yes' : 'No'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {/* NAT rule: Median date as cut-off for current subject */}
              <p className="text-muted-foreground text-sm">
                Enrollment into an ongoing subject closes on the median date.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {!!selectedPlanId && previewSubjects.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-semibold tracking-tight">
              Commencement Date
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
    </div>
  );
}
