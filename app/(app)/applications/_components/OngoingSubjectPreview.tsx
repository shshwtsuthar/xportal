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
import { useCalculateEnrollmentProgression } from '@/src/hooks/useCalculateEnrollmentProgression';
import { format } from 'date-fns';

type Props = {
  timetableId?: string;
};

const getNowInAustraliaSydney = (): Date => {
  // Build a Date representing the current wall-clock time in Australia/Sydney
  const fmt = new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Sydney',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = fmt.formatToParts(new Date());
  const lookup = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  const y = Number(lookup.year);
  const m = Number(lookup.month);
  const d = Number(lookup.day);
  const hh = Number(lookup.hour);
  const mm = Number(lookup.minute);
  const ss = Number(lookup.second);

  // Create a Date in local timezone using the Sydney wall-clock fields
  // This is sufficient for ordering comparisons within the same zone context
  return new Date(y, m - 1, d, hh, mm, ss);
};

export function OngoingSubjectPreview({ timetableId }: Props) {
  const { allSubjects } = useCalculateEnrollmentProgression(
    timetableId,
    undefined
  );
  if (!timetableId) {
    return null;
  }

  const now = getNowInAustraliaSydney();

  const idx = (() => {
    const ongoingIndex = allSubjects.findIndex((s) => {
      const start = new Date(s.start_date);
      const end = new Date(s.end_date);
      return now >= start && now <= end; // inclusive
    });
    if (ongoingIndex !== -1) return ongoingIndex;
    return allSubjects.findIndex((s) => new Date(s.start_date) > now);
  })();

  const display = idx === -1 ? [] : allSubjects.slice(idx, idx + 3);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Ongoing Subjects</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="w-full overflow-hidden rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="divide-x">
                <TableHead>Subject</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>Median Date</TableHead>
                <TableHead>End Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y">
              {display.length === 0 ? (
                <TableRow className="divide-x">
                  <TableCell colSpan={4}>
                    <p className="text-muted-foreground text-sm">
                      No upcoming subjects found.
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                display.map((subject) => (
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
                      {format(new Date(subject.median_date), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell>
                      {format(new Date(subject.end_date), 'MMM dd, yyyy')}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

export default OngoingSubjectPreview;
