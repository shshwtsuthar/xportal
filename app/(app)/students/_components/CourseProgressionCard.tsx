'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { useGetStudentEnrollmentSubjects } from '@/src/hooks/useGetStudentEnrollmentSubjects';
import { calculateDateRangeStatus } from '@/lib/utils/status';
import { SubjectClassesTable } from './SubjectClassesTable';
import { format } from 'date-fns';

type CourseProgressionCardProps = {
  studentId: string;
};

export function CourseProgressionCard({
  studentId,
}: CourseProgressionCardProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const {
    data: enrollmentSubjects,
    isLoading,
    isError,
  } = useGetStudentEnrollmentSubjects(studentId);

  const toggleRowExpansion = (subjectId: string) => {
    const newExpandedRows = new Set(expandedRows);
    if (newExpandedRows.has(subjectId)) {
      newExpandedRows.delete(subjectId);
    } else {
      newExpandedRows.add(subjectId);
    }
    setExpandedRows(newExpandedRows);
  };

  // Extract enrollment_id from the first subject (assuming all subjects belong to the same enrollment)
  const enrollmentId = enrollmentSubjects?.[0]?.enrollment_id;

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
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Subject Code</TableHead>
                  <TableHead>Subject Name</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y">
                {enrollmentSubjects.map((subject) => {
                  const isExpanded = expandedRows.has(subject.id);
                  const status = calculateDateRangeStatus(
                    subject.start_date,
                    subject.end_date
                  );
                  const canExpand = Boolean(
                    enrollmentId && subject.program_plan_subjects?.id
                  );

                  return (
                    <React.Fragment key={subject.id}>
                      <TableRow
                        className="hover:bg-muted/50 cursor-pointer divide-x"
                        onClick={() =>
                          canExpand && toggleRowExpansion(subject.id)
                        }
                        role="button"
                        tabIndex={0}
                        aria-expanded={isExpanded}
                        onKeyDown={(e) => {
                          if (
                            (e.key === 'Enter' || e.key === ' ') &&
                            canExpand
                          ) {
                            e.preventDefault();
                            toggleRowExpansion(subject.id);
                          }
                        }}
                      >
                        <TableCell className="w-8">
                          {canExpand && (
                            <div className="transition-transform duration-200">
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{subject.subjects?.code ?? '—'}</TableCell>
                        <TableCell>{subject.subjects?.name ?? '—'}</TableCell>
                        <TableCell>
                          {subject.start_date
                            ? format(
                                new Date(subject.start_date),
                                'dd MMM yyyy'
                              )
                            : '—'}
                        </TableCell>
                        <TableCell>
                          {subject.end_date
                            ? format(new Date(subject.end_date), 'dd MMM yyyy')
                            : '—'}
                        </TableCell>
                        <TableCell>
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
                      {isExpanded &&
                        canExpand &&
                        enrollmentId &&
                        subject.program_plan_subjects?.id && (
                          <TableRow>
                            <TableCell colSpan={6} className="border-t p-0">
                              <div className="px-2 py-2">
                                <SubjectClassesTable
                                  enrollmentId={enrollmentId}
                                  programPlanSubjectId={
                                    subject.program_plan_subjects.id
                                  }
                                  subjectName={
                                    subject.subjects?.name ?? 'Unknown Subject'
                                  }
                                />
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
