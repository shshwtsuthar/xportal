'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useGetStudents } from '@/src/hooks/useGetStudents';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import type { Enums } from '@/database.types';

type StudentStatus = Enums<'student_status'>;

type Props = {
  q?: string;
  status?: StudentStatus;
};

export function StudentsDataTable({ q, status }: Props) {
  const { data, isLoading, isError } = useGetStudents({ q, status });
  const rows = useMemo(() => data ?? [], [data]);

  if (isLoading) {
    return <p className="text-muted-foreground text-sm">Loading students…</p>;
  }
  if (isError) {
    return <p className="text-destructive text-sm">Failed to load students.</p>;
  }

  const formatDate = (value: string | null) => {
    if (!value) return '';
    try {
      return format(new Date(value), 'dd MMM yyyy');
    } catch {
      return String(value);
    }
  };

  return (
    <div className="w-full overflow-hidden rounded-md border">
      <Table>
        <TableHeader>
          <TableRow className="divide-x">
            <TableHead>Name</TableHead>
            <TableHead>Student ID</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created At</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y">
          {rows.map((s) => (
            <TableRow key={s.id} className="divide-x">
              <TableCell>
                <Link
                  href={`/students/${s.id}`}
                  className="hover:underline"
                  aria-label={`View ${[s.first_name, s.last_name]
                    .filter(Boolean)
                    .join(' ')}`}
                >
                  {[s.first_name, s.last_name].filter(Boolean).join(' ') || '—'}
                </Link>
              </TableCell>
              <TableCell>{s.student_id_display || '—'}</TableCell>
              <TableCell>{s.email || '—'}</TableCell>
              <TableCell>
                <Badge
                  variant={
                    s.status === 'WITHDRAWN'
                      ? 'destructive'
                      : s.status === 'ACTIVE'
                        ? 'default'
                        : 'secondary'
                  }
                >
                  {s.status}
                </Badge>
              </TableCell>
              <TableCell>
                {formatDate(s.created_at as unknown as string)}
              </TableCell>
              <TableCell className="text-right">
                <Link href={`/students/${s.id}`} className="text-primary">
                  View
                </Link>
              </TableCell>
            </TableRow>
          ))}
          {rows.length === 0 && (
            <TableRow className="divide-x">
              <TableCell colSpan={6}>
                <p className="text-muted-foreground text-sm">
                  No students found.
                </p>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
