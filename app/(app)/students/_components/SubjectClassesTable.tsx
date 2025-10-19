'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useGetEnrollmentSubjectClasses } from '@/src/hooks/useGetEnrollmentSubjectClasses';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { useUpsertEnrollmentClassAttendance } from '@/src/hooks/useUpsertEnrollmentClassAttendance';
import { toast } from 'sonner';
import { calculateDateRangeStatus } from '@/lib/utils/status';
import { format } from 'date-fns';

type SubjectClassesTableProps = {
  enrollmentId: string;
  programPlanSubjectId: string;
  subjectName: string;
};

export function SubjectClassesTable({
  enrollmentId,
  programPlanSubjectId,
}: SubjectClassesTableProps) {
  const {
    data: classes,
    isLoading,
    isError,
  } = useGetEnrollmentSubjectClasses(enrollmentId, programPlanSubjectId);

  const { mutateAsync: upsertAttendance, isPending } =
    useUpsertEnrollmentClassAttendance();

  const handleToggleAttendance = async (
    enrollmentClassId: string,
    present: boolean | null
  ) => {
    try {
      await upsertAttendance({ enrollmentClassId, present });
      toast.success('Attendance updated');
    } catch (e: unknown) {
      toast.error(
        e instanceof Error ? e.message : 'Failed to update attendance'
      );
    }
  };

  if (isLoading) {
    return (
      <div className="bg-muted/30 rounded-md border p-4">
        <p className="text-muted-foreground text-sm">Loading classes...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-muted/30 rounded-md border p-4">
        <p className="text-destructive text-sm">Failed to load classes.</p>
      </div>
    );
  }

  if (!classes || classes.length === 0) {
    return (
      <div className="bg-muted/30 rounded-md border p-4">
        <p className="text-muted-foreground text-sm">No classes scheduled.</p>
      </div>
    );
  }

  return (
    <div className="bg-background w-full overflow-hidden rounded-md border">
      <Table className="divide-y">
        <TableHeader>
          <TableRow className="divide-x border-b">
            <TableHead className="text-sm font-medium">Date</TableHead>
            <TableHead className="text-sm font-medium">Start Time</TableHead>
            <TableHead className="text-sm font-medium">End Time</TableHead>
            <TableHead className="text-sm font-medium">Location</TableHead>
            <TableHead className="text-sm font-medium">Classroom</TableHead>
            <TableHead className="text-sm font-medium">Status</TableHead>
            <TableHead className="text-sm font-medium">Attendance</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y">
          {classes.map((classItem) => {
            const status = calculateDateRangeStatus(
              classItem.class_date,
              classItem.class_date
            );

            return (
              <TableRow key={classItem.id} className="divide-x">
                <TableCell className="text-sm">
                  {classItem.class_date
                    ? format(new Date(classItem.class_date), 'dd MMM yyyy')
                    : '—'}
                </TableCell>
                <TableCell className="text-sm">
                  {classItem.start_time
                    ? format(
                        new Date(`2000-01-01T${classItem.start_time}`),
                        'HH:mm'
                      )
                    : '—'}
                </TableCell>
                <TableCell className="text-sm">
                  {classItem.end_time
                    ? format(
                        new Date(`2000-01-01T${classItem.end_time}`),
                        'HH:mm'
                      )
                    : '—'}
                </TableCell>
                <TableCell className="text-sm">
                  {classItem.delivery_locations?.name ?? '—'}
                </TableCell>
                <TableCell className="text-sm">
                  {classItem.classrooms?.name ?? '—'}
                </TableCell>
                <TableCell className="text-sm">
                  <Badge
                    variant={
                      status === 'Completed'
                        ? 'secondary'
                        : status === 'Ongoing'
                          ? 'default'
                          : 'outline'
                    }
                  >
                    {status}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      aria-label="Mark present"
                      checked={
                        classItem.enrollment_class_attendances?.present ?? false
                      }
                      onCheckedChange={(val) =>
                        handleToggleAttendance(
                          classItem.id,
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
                      onClick={() => handleToggleAttendance(classItem.id, null)}
                      disabled={isPending}
                    >
                      Reset
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
