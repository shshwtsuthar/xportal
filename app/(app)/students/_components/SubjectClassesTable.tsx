'use client';

import { Card, CardContent } from '@/components/ui/card';
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
  subjectName,
}: SubjectClassesTableProps) {
  const {
    data: classes,
    isLoading,
    isError,
  } = useGetEnrollmentSubjectClasses(enrollmentId, programPlanSubjectId);

  if (isLoading) {
    return (
      <div className="bg-muted/30 p-4">
        <p className="text-muted-foreground text-sm">Loading classes...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-muted/30 p-4">
        <p className="text-destructive text-sm">Failed to load classes.</p>
      </div>
    );
  }

  if (!classes || classes.length === 0) {
    return (
      <div className="bg-muted/30 p-4">
        <p className="text-muted-foreground text-sm">No classes scheduled.</p>
      </div>
    );
  }

  return (
    <div className="bg-muted/30">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-sm font-medium">Date</TableHead>
            <TableHead className="text-sm font-medium">Start Time</TableHead>
            <TableHead className="text-sm font-medium">End Time</TableHead>
            <TableHead className="text-sm font-medium">Location</TableHead>
            <TableHead className="text-sm font-medium">Classroom</TableHead>
            <TableHead className="text-sm font-medium">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {classes.map((classItem) => {
            const status = calculateDateRangeStatus(
              classItem.class_date,
              classItem.class_date
            );

            return (
              <TableRow key={classItem.id}>
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
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
