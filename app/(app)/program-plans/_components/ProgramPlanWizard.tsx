'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useGetPrograms } from '@/src/hooks/useGetPrograms';
import { useGetSubjects } from '@/src/hooks/useGetSubjects';
import { useGetProgramPlanSubjects } from '@/src/hooks/useGetProgramPlanSubjects';
import { ClassesManager } from './ClassesManager';
import { Tables } from '@/database.types';
import { useUpsertProgramPlan } from '@/src/hooks/useUpsertProgramPlan';
import { useUpsertProgramPlanSubject } from '@/src/hooks/useUpsertProgramPlanSubject';
import { useRouter } from 'next/navigation';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Plus, Trash } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';

type PlanRow = {
  id?: string;
  subject_id?: string;
  start_date?: Date;
  end_date?: Date;
  sequence_order?: number;
  is_prerequisite?: boolean;
};

export function ProgramPlanWizard({
  plan,
}: {
  plan?: Tables<'program_plans'>;
}) {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(0);
  const upsertPlan = useUpsertProgramPlan();
  const upsertPlanSubject = useUpsertProgramPlanSubject();
  const { data: programs = [] } = useGetPrograms();
  const { data: subjects = [] } = useGetSubjects();

  const form = useForm<{
    name: string;
    program_id: string;
    program_plan_id?: string;
  }>({
    defaultValues: {
      name: plan?.name ?? '',
      program_id: (plan?.program_id as string) ?? '',
      program_plan_id: plan?.id as string | undefined,
    },
  });

  const programId = useWatch({
    control: form.control,
    name: 'program_id',
  });

  // Load existing plan subjects if editing
  const { data: existingSubjects = [] } = useGetProgramPlanSubjects(
    plan?.id as string
  );

  const [rows, setRows] = useState<PlanRow[]>([]);

  // Load existing subjects into rows when editing
  useEffect(() => {
    if (plan && existingSubjects.length > 0) {
      const loadedRows: PlanRow[] = existingSubjects.map((subj) => ({
        id: subj.id as string,
        subject_id: subj.subject_id as string,
        start_date: new Date(subj.start_date as string),
        end_date: new Date(subj.end_date as string),
        sequence_order: subj.sequence_order ?? undefined,
        is_prerequisite: subj.is_prerequisite ?? false,
      }));
      setRows(loadedRows);
    }
  }, [plan, existingSubjects]);

  const addRow = () => setRows((r) => [...r, {}]);
  const removeRow = (idx: number) =>
    setRows((r) => r.filter((_, i) => i !== idx));

  const updateRow = (
    idx: number,
    field: keyof PlanRow,
    value: string | Date | number | boolean | undefined
  ) => {
    setRows((r) => r.map((x, i) => (i === idx ? { ...x, [field]: value } : x)));
  };

  const handleSave = async () => {
    try {
      const values = form.getValues();
      if (!values.name || !values.program_id) {
        toast.error('Enter plan name and program');
        return;
      }

      const savedPlan = await upsertPlan.mutateAsync({
        id: values.program_plan_id,
        name: values.name,
        program_id:
          values.program_id as unknown as Tables<'program_plans'>['program_id'],
      });

      // Save each row
      for (const row of rows) {
        if (!row.subject_id || !row.start_date || !row.end_date) continue;
        await upsertPlanSubject.mutateAsync({
          id: row.id,
          program_plan_id: savedPlan.id as string,
          subject_id: row.subject_id as string,
          start_date: format(row.start_date, 'yyyy-MM-dd'),
          end_date: format(row.end_date, 'yyyy-MM-dd'),
          sequence_order: row.sequence_order ?? (null as unknown as number),
          is_prerequisite: Boolean(row.is_prerequisite),
        });
      }

      toast.success('Program plan saved');
      router.push('/program-plans');
    } catch (e) {
      toast.error(String((e as Error).message || e));
    }
  };

  const StepContent = useMemo(() => {
    if (activeStep === 0)
      return (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <Label>Name *</Label>
            <Input
              {...form.register('name')}
              placeholder="e.g. 2025 Standard Intake"
            />
          </div>
          <div className="grid gap-2">
            <Label>Program *</Label>
            <Select
              value={programId}
              onValueChange={(v) => {
                form.setValue('program_id', v);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a program" />
              </SelectTrigger>
              <SelectContent>
                {programs.map((p) => (
                  <SelectItem key={p.id} value={p.id as string}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      );

    if (activeStep === 1)
      return (
        <div className="grid gap-4">
          <div className="flex justify-between">
            <div>
              <h3 className="text-lg font-medium">Plan Builder</h3>
              <p className="text-muted-foreground text-sm">
                Add subjects with their scheduled dates and properties
              </p>
            </div>
            <Button type="button" variant="outline" onClick={addRow}>
              <Plus className="mr-2 h-4 w-4" /> Add Subject
            </Button>
          </div>

          <div className="w-full overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="divide-x">
                  <TableHead>Subject</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>End</TableHead>
                  <TableHead>Prerequisite</TableHead>
                  <TableHead>Sequence</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y">
                {rows.length === 0 ? (
                  <TableRow className="divide-x">
                    <TableCell colSpan={6}>
                      <p className="text-muted-foreground text-sm">
                        No subjects added
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row, idx) => (
                    <React.Fragment key={idx}>
                      <TableRow className="divide-x">
                        <TableCell>
                          <Select
                            value={row.subject_id}
                            onValueChange={(v) =>
                              updateRow(idx, 'subject_id', v)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select subject" />
                            </SelectTrigger>
                            <SelectContent>
                              {subjects.map((s) => (
                                <SelectItem key={s.id} value={s.id as string}>
                                  {(s.code ?? '') + ' - ' + s.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  'w-full justify-start text-left font-normal',
                                  !row.start_date && 'text-muted-foreground'
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {row.start_date
                                  ? format(row.start_date, 'PPP')
                                  : 'Pick date'}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-auto p-0"
                              align="start"
                            >
                              <Calendar
                                mode="single"
                                selected={row.start_date}
                                onSelect={(d) =>
                                  updateRow(idx, 'start_date', d ?? undefined)
                                }
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </TableCell>
                        <TableCell>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  'w-full justify-start text-left font-normal',
                                  !row.end_date && 'text-muted-foreground'
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {row.end_date
                                  ? format(row.end_date, 'PPP')
                                  : 'Pick date'}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-auto p-0"
                              align="start"
                            >
                              <Calendar
                                mode="single"
                                selected={row.end_date}
                                onSelect={(d) =>
                                  updateRow(idx, 'end_date', d ?? undefined)
                                }
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={Boolean(row.is_prerequisite)}
                              onCheckedChange={(v) =>
                                updateRow(idx, 'is_prerequisite', Boolean(v))
                              }
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={row.sequence_order ?? ''}
                            onChange={(e) =>
                              updateRow(
                                idx,
                                'sequence_order',
                                e.target.value
                                  ? Number(e.target.value)
                                  : undefined
                              )
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            aria-label="Remove"
                            onClick={() => removeRow(idx)}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                      {row.id && row.start_date && row.end_date && (
                        <TableRow>
                          <TableCell colSpan={6} className="p-0">
                            <div className="px-4 py-2">
                              <ClassesManager
                                programPlanSubjectId={row.id}
                                subjectStartDate={row.start_date}
                                subjectEndDate={row.end_date}
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      );
  }, [activeStep, form, programs, subjects, rows, programId]);

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {plan ? 'Edit Program Plan' : 'New Program Plan'}
          </h1>
          <p className="text-muted-foreground text-sm">
            {plan
              ? 'Modify the program plan details and schedule'
              : 'Define a reusable schedule for a program'}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold tracking-tight">
            <div className="flex items-center gap-2">
              {['Details', 'Builder'].map((label, i) => (
                <Button
                  key={label}
                  size="sm"
                  variant={i === activeStep ? 'default' : 'outline'}
                  onClick={() => setActiveStep(i)}
                  aria-label={`Go to ${label}`}
                >
                  {label}
                </Button>
              ))}
            </div>
          </CardTitle>
        </CardHeader>
        <Form {...form}>
          <CardContent>{StepContent}</CardContent>
          <CardFooter className="flex items-center justify-between">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setActiveStep(Math.max(0, activeStep - 1))}
                aria-label="Previous step"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                onClick={() => setActiveStep(Math.min(1, activeStep + 1))}
                aria-label="Next step"
              >
                Next
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={handleSave}
                disabled={upsertPlan.isPending || upsertPlanSubject.isPending}
              >
                {upsertPlan.isPending || upsertPlanSubject.isPending
                  ? 'Saving…'
                  : 'Save Plan'}
              </Button>
            </div>
          </CardFooter>
        </Form>
      </Card>
    </div>
  );
}
