'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useUpsertEnrollmentClassAttendance } from '@/src/hooks/useUpsertEnrollmentClassAttendance';
import { useGetTodayClassesForAttendance } from '@/src/hooks/useGetTodayClassesForAttendance';
import { useGetStudentAttendanceSummary } from '@/src/hooks/useGetStudentAttendanceSummary';
import { useGetStudents } from '@/src/hooks/useGetStudents';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { PageContainer } from '@/components/page-container';

// TODO: Wire real hooks once migration/types are applied
// Placeholder data hooks (to be implemented):
// useGetTodayClassesForAttendance, useGetStudentAttendanceSummary, useGetPrograms, useGetTrainers, useGetStudents

export default function AttendancePage() {
  const [activeTab, setActiveTab] = useState<'today' | 'student'>('today');

  // Filters state (wire to real data later)
  const [programId, setProgramId] = useState<string | undefined>();
  const [trainerId, setTrainerId] = useState<string | undefined>();
  const [studentFilter, setStudentFilter] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<
    string | undefined
  >();
  const [isStudentPickerOpen, setIsStudentPickerOpen] = useState(false);
  const [studentQuery, setStudentQuery] = useState('');

  const { mutateAsync: upsertAttendance, isPending } =
    useUpsertEnrollmentClassAttendance();
  const { data: todayRows = [], isLoading: isLoadingToday } =
    useGetTodayClassesForAttendance({
      programId,
      trainerId,
      studentId: undefined,
    });
  const studentSummary = useGetStudentAttendanceSummary(selectedStudentId);
  const { data: studentOptions = [] } = useGetStudents(
    studentQuery
      ? {
          search: studentQuery,
        }
      : undefined
  );

  const handleToggleAttendance = async (
    enrollmentClassId: string,
    present: boolean | null
  ) => {
    try {
      await upsertAttendance({
        enrollmentClassId,
        present,
        invalidateKeys: [
          ['attendance-today', { programId, trainerId, studentId: undefined }],
          ['attendance-student', selectedStudentId ?? 'none'],
        ],
      });
      toast.success('Attendance updated');
    } catch (e: unknown) {
      toast.error(
        e instanceof Error ? e.message : 'Failed to update attendance'
      );
    }
  };

  return (
    <PageContainer title="Attendance">
      <Card>
        <CardHeader>
          <CardTitle>Manage Attendance</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as 'today' | 'student')}
          >
            <TabsList>
              <TabsTrigger value="today">Today</TabsTrigger>
              <TabsTrigger value="student">Student Summary</TabsTrigger>
            </TabsList>

            <TabsContent value="today" className="mt-4">
              <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-4">
                <Select onValueChange={(v) => setProgramId(v)}>
                  <SelectTrigger aria-label="Filter by program">
                    <SelectValue placeholder="Program" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* TODO: map real programs */}
                    <SelectItem value="all">All Programs</SelectItem>
                  </SelectContent>
                </Select>
                <Select onValueChange={(v) => setTrainerId(v)}>
                  <SelectTrigger aria-label="Filter by trainer">
                    <SelectValue placeholder="Trainer" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* TODO: map real trainers */}
                    <SelectItem value="all">All Trainers</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  value={studentFilter}
                  onChange={(e) => setStudentFilter(e.target.value)}
                  placeholder="Filter by student name"
                  aria-label="Filter by student"
                />
                <Button
                  variant="outline"
                  onClick={() => {
                    setProgramId(undefined);
                    setTrainerId(undefined);
                    setStudentFilter('');
                  }}
                >
                  Clear Filters
                </Button>
              </div>

              <div className="w-full overflow-hidden rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Program</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Trainer</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Attendance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingToday ? (
                      <TableRow>
                        <TableCell
                          colSpan={9}
                          className="text-muted-foreground text-sm"
                        >
                          Loading…
                        </TableCell>
                      </TableRow>
                    ) : todayRows.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={9}
                          className="text-muted-foreground text-sm"
                        >
                          No classes found for today.
                        </TableCell>
                      </TableRow>
                    ) : (
                      todayRows.map((row) => {
                        const status = row.class_date
                          ? new Date(row.class_date) < new Date()
                            ? 'Completed'
                            : 'Upcoming'
                          : '—';
                        const program = row.enrollments?.programs;
                        const student = row.enrollments?.students;
                        const subject =
                          row.program_plan_classes?.program_plan_subjects
                            ?.subjects;
                        return (
                          <TableRow key={row.id}>
                            <TableCell>
                              {row.class_date
                                ? format(
                                    new Date(row.class_date),
                                    'dd MMM yyyy'
                                  )
                                : '—'}
                            </TableCell>
                            <TableCell>
                              {row.start_time
                                ? format(
                                    new Date(`2000-01-01T${row.start_time}`),
                                    'HH:mm'
                                  )
                                : '—'}
                              {' — '}
                              {row.end_time
                                ? format(
                                    new Date(`2000-01-01T${row.end_time}`),
                                    'HH:mm'
                                  )
                                : '—'}
                            </TableCell>
                            <TableCell>
                              {program?.code ?? program?.name ?? '—'}
                            </TableCell>
                            <TableCell>
                              {subject?.code ?? subject?.name ?? '—'}
                            </TableCell>
                            <TableCell>
                              {student
                                ? `${student.first_name} ${student.last_name}`
                                : '—'}
                            </TableCell>
                            <TableCell>{row.trainer_id ?? '—'}</TableCell>
                            <TableCell>
                              {row.delivery_locations?.name ?? '—'}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  status === 'Completed'
                                    ? 'secondary'
                                    : status === 'Upcoming'
                                      ? 'outline'
                                      : 'default'
                                }
                              >
                                {status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  aria-label="Mark present"
                                  checked={
                                    row.enrollment_class_attendances?.present ??
                                    false
                                  }
                                  onCheckedChange={(val) =>
                                    handleToggleAttendance(
                                      row.id,
                                      val === true ? true : false
                                    )
                                  }
                                  disabled={isPending}
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2"
                                  aria-label="Reset attendance to unmarked"
                                  onClick={() =>
                                    handleToggleAttendance(row.id, null)
                                  }
                                  disabled={isPending}
                                >
                                  Reset
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="student" className="mt-4">
              <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsStudentPickerOpen(true)}
                    aria-label="Open student picker"
                  >
                    {selectedStudentId ? 'Change Student' : 'Select Student'}
                  </Button>
                  {selectedStudentId ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9"
                      onClick={() => setSelectedStudentId(undefined)}
                      aria-label="Clear selected student"
                    >
                      Clear
                    </Button>
                  ) : null}
                </div>

                <CommandDialog
                  open={isStudentPickerOpen}
                  onOpenChange={setIsStudentPickerOpen}
                  title="Select Student"
                  description="Search for a student by name or email"
                >
                  <CommandInput
                    placeholder="Type a name or email..."
                    value={studentQuery}
                    onValueChange={setStudentQuery}
                  />
                  <CommandList>
                    <CommandEmpty>No students found.</CommandEmpty>
                    <CommandGroup heading="Students">
                      {studentOptions.map((s) => (
                        <CommandItem
                          key={s.id}
                          onSelect={() => {
                            setSelectedStudentId(s.id);
                            setIsStudentPickerOpen(false);
                          }}
                          aria-label={`${s.first_name} ${s.last_name}`}
                        >
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">
                              {s.first_name} {s.last_name}
                            </span>
                            <span className="text-muted-foreground text-xs">
                              {s.email} · {s.student_id_display}
                            </span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </CommandDialog>
              </div>

              {!selectedStudentId ? (
                <p className="text-muted-foreground text-sm">
                  Select a student to view attendance.
                </p>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg font-medium">
                          Attendance
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-1 text-sm">
                          <div>
                            Total classes:{' '}
                            {studentSummary.aggregates.reduce(
                              (a, b) => a + b.total,
                              0
                            )}
                          </div>
                          <div>
                            Present:{' '}
                            {studentSummary.aggregates.reduce(
                              (a, b) => a + b.present,
                              0
                            )}
                          </div>
                          <div>
                            Absent:{' '}
                            {studentSummary.aggregates.reduce(
                              (a, b) => a + b.absent,
                              0
                            )}
                          </div>
                          <div>
                            Unmarked:{' '}
                            {studentSummary.aggregates.reduce(
                              (a, b) => a + b.unmarked,
                              0
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="w-full overflow-hidden rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Time</TableHead>
                          <TableHead>Subject</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Attendance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {studentSummary.isLoading ? (
                          <TableRow>
                            <TableCell
                              colSpan={5}
                              className="text-muted-foreground text-sm"
                            >
                              Loading…
                            </TableCell>
                          </TableRow>
                        ) : studentSummary.rows.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={5}
                              className="text-muted-foreground text-sm"
                            >
                              No classes for selected student.
                            </TableCell>
                          </TableRow>
                        ) : (
                          studentSummary.rows.map((row) => {
                            const subject =
                              row.program_plan_classes?.program_plan_subjects
                                ?.subjects;
                            const status = row.class_date
                              ? new Date(row.class_date) < new Date()
                                ? 'Completed'
                                : 'Upcoming'
                              : '—';
                            return (
                              <TableRow key={row.id}>
                                <TableCell>
                                  {row.class_date
                                    ? format(
                                        new Date(row.class_date),
                                        'dd MMM yyyy'
                                      )
                                    : '—'}
                                </TableCell>
                                <TableCell>
                                  {row.start_time
                                    ? format(
                                        new Date(
                                          `2000-01-01T${row.start_time}`
                                        ),
                                        'HH:mm'
                                      )
                                    : '—'}
                                  {' — '}
                                  {row.end_time
                                    ? format(
                                        new Date(`2000-01-01T${row.end_time}`),
                                        'HH:mm'
                                      )
                                    : '—'}
                                </TableCell>
                                <TableCell>
                                  {subject?.code ?? subject?.name ?? '—'}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={
                                      status === 'Completed'
                                        ? 'secondary'
                                        : status === 'Upcoming'
                                          ? 'outline'
                                          : 'default'
                                    }
                                  >
                                    {status}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Checkbox
                                      aria-label="Mark present"
                                      checked={
                                        row.enrollment_class_attendances
                                          ?.present ?? false
                                      }
                                      onCheckedChange={(val) =>
                                        handleToggleAttendance(
                                          row.id,
                                          val === true ? true : false
                                        )
                                      }
                                      disabled={isPending}
                                    />
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 px-2"
                                      aria-label="Reset attendance to unmarked"
                                      onClick={() =>
                                        handleToggleAttendance(row.id, null)
                                      }
                                      disabled={isPending}
                                    >
                                      Reset
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
