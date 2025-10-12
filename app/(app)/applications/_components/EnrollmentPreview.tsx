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
import { Badge } from '@/components/ui/badge';
import { useCalculateEnrollmentProgression } from '@/src/hooks/useCalculateEnrollmentProgression';
import { format } from 'date-fns';

type EnrollmentPreviewProps = {
  timetableId?: string;
  commencementDate?: Date;
};

export function EnrollmentPreview({
  timetableId,
  commencementDate,
}: EnrollmentPreviewProps) {
  const { progression, isLoading } = useCalculateEnrollmentProgression(
    timetableId,
    commencementDate
  );

  if (isLoading || !timetableId || !commencementDate) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Enrollment Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Select a timetable and commencement date to see your enrollment
            progression.
          </p>
        </CardContent>
      </Card>
    );
  }

  const { allSubjects, currentCycleSubjects, catchUpSubjects, prerequisites } =
    progression;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Enrollment Preview</CardTitle>
        <div className="text-muted-foreground text-sm">
          <p>Commencement Date: {format(commencementDate, 'MMM dd, yyyy')}</p>
          <p>Total Subjects: {allSubjects.length}</p>
          {currentCycleSubjects.length > 0 && (
            <p>Current Cycle: {currentCycleSubjects.length} subjects</p>
          )}
          {catchUpSubjects.length > 0 && (
            <p>Catch-up Required: {catchUpSubjects.length} subjects</p>
          )}
          {prerequisites.length > 0 && (
            <p>
              Prerequisites: {prerequisites.length} subjects (concurrent study)
            </p>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="w-full overflow-hidden rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="divide-x">
                <TableHead>Subject</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Cycle</TableHead>
                <TableHead>Type</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y">
              {allSubjects.length === 0 ? (
                <TableRow className="divide-x">
                  <TableCell colSpan={5}>
                    <p className="text-muted-foreground text-sm">
                      No subjects found for this timetable.
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                allSubjects.map((subject) => (
                  <TableRow key={subject.id} className="divide-x">
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {subject.subject_name}
                        </div>
                        <div className="text-muted-foreground text-xs">
                          Sequence: {subject.sequence_order}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {format(new Date(subject.start_date), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell>
                      {format(new Date(subject.end_date), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{subject.cycle_year}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {subject.is_prerequisite && (
                          <Badge variant="secondary" className="text-xs">
                            Prerequisite
                          </Badge>
                        )}
                        {subject.isCatchUp && (
                          <Badge variant="destructive" className="text-xs">
                            Catch-up
                          </Badge>
                        )}
                        {!subject.is_prerequisite && !subject.isCatchUp && (
                          <Badge variant="default" className="text-xs">
                            Current
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Prerequisites Note */}
        {prerequisites.length > 0 && (
          <div className="mt-4 rounded-lg bg-blue-50 p-3">
            <h4 className="mb-1 text-sm font-medium text-blue-900">
              Prerequisites Note
            </h4>
            <p className="text-xs text-blue-700">
              Subjects marked as &quot;Prerequisite&quot; will be studied
              concurrently with your first subject, regardless of their normal
              sequence order. This ensures you meet all requirements for your
              qualification.
            </p>
          </div>
        )}

        {/* Catch-up Note */}
        {catchUpSubjects.length > 0 && (
          <div className="mt-4 rounded-lg bg-orange-50 p-3">
            <h4 className="mb-1 text-sm font-medium text-orange-900">
              Catch-up Required
            </h4>
            <p className="text-xs text-orange-700">
              You will need to complete {catchUpSubjects.length} subjects from
              previous cycles to fulfill your qualification requirements. These
              will be scheduled in the next available program plan cycle.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
