'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useGetStudentEnrollmentSubjects } from '@/src/hooks/useGetStudentEnrollmentSubjects';
import { format } from 'date-fns';

type CourseProgressionCardProps = {
  studentId: string;
};

export function CourseProgressionCard({
  studentId,
}: CourseProgressionCardProps) {
  const {
    data: enrollmentSubjects,
    isLoading,
    isError,
  } = useGetStudentEnrollmentSubjects(studentId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Course Progression</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">Loading subjects...</p>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Course Progression</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive text-sm">Failed to load subjects.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Course Progression</CardTitle>
      </CardHeader>
      <CardContent>
        {!enrollmentSubjects || enrollmentSubjects.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No subjects enrolled yet.
          </p>
        ) : (
          <div className="w-full overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="divide-x">
                  <TableHead>Subject Code</TableHead>
                  <TableHead>Subject Name</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Outcome Code</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y">
                {enrollmentSubjects.map((subject) => (
                  <TableRow key={subject.id} className="divide-x">
                    <TableCell>{subject.subjects?.code ?? '—'}</TableCell>
                    <TableCell>{subject.subjects?.name ?? '—'}</TableCell>
                    <TableCell>
                      {subject.start_date
                        ? format(new Date(subject.start_date), 'dd MMM yyyy')
                        : '—'}
                    </TableCell>
                    <TableCell>
                      {subject.end_date
                        ? format(new Date(subject.end_date), 'dd MMM yyyy')
                        : '—'}
                    </TableCell>
                    <TableCell>{subject.outcome_code ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
