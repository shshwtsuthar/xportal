'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
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
import { SortableTableHead } from '@/components/ui/sortable-table-head';
import { format } from 'date-fns';
import type { Enums } from '@/database.types';

type StudentStatus = Enums<'student_status'>;

type Props = {
  q?: string;
  status?: StudentStatus;
};

export function StudentsDataTable({ q, status }: Props) {
  const { data, isLoading, isError } = useGetStudents({ q, status });
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);

  const handleSort = (key: string) => {
    setSortConfig((prevConfig) => {
      if (prevConfig?.key === key) {
        return prevConfig.direction === 'asc'
          ? { key, direction: 'desc' }
          : null;
      }
      return { key, direction: 'asc' };
    });
  };

  const rows = useMemo(() => {
    const baseRows = data ?? [];
    if (!sortConfig) return baseRows;

    return [...baseRows].sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;

      switch (sortConfig.key) {
        case 'name':
          aVal = [a.first_name, a.last_name].filter(Boolean).join(' ');
          bVal = [b.first_name, b.last_name].filter(Boolean).join(' ');
          break;
        case 'student_id':
          aVal = a.student_id_display || '';
          bVal = b.student_id_display || '';
          break;
        case 'email':
          aVal = a.email || '';
          bVal = b.email || '';
          break;
        case 'status':
          aVal = a.status;
          bVal = b.status;
          break;
        case 'created_at':
          aVal = a.created_at ? new Date(a.created_at).getTime() : 0;
          bVal = b.created_at ? new Date(b.created_at).getTime() : 0;
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortConfig]);

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
            <SortableTableHead
              onSort={() => handleSort('name')}
              sortDirection={
                sortConfig?.key === 'name' ? sortConfig.direction : null
              }
            >
              Name
            </SortableTableHead>
            <SortableTableHead
              onSort={() => handleSort('student_id')}
              sortDirection={
                sortConfig?.key === 'student_id' ? sortConfig.direction : null
              }
            >
              Student ID
            </SortableTableHead>
            <SortableTableHead
              onSort={() => handleSort('email')}
              sortDirection={
                sortConfig?.key === 'email' ? sortConfig.direction : null
              }
            >
              Email
            </SortableTableHead>
            <SortableTableHead
              onSort={() => handleSort('status')}
              sortDirection={
                sortConfig?.key === 'status' ? sortConfig.direction : null
              }
            >
              Status
            </SortableTableHead>
            <SortableTableHead
              onSort={() => handleSort('created_at')}
              sortDirection={
                sortConfig?.key === 'created_at' ? sortConfig.direction : null
              }
            >
              Created At
            </SortableTableHead>
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
