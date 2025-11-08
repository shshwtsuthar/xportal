'use client';

import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Tables } from '@/database.types';

export type RowType = Tables<'students'>;

export type ColumnDef = {
  id: string;
  label: string;
  width?: number;
  sortable?: boolean;
  sortAccessor?: (row: RowType) => string | number;
  render: (row: RowType) => React.ReactNode;
  group?: string;
};

const FMT_DATE = (v: string | null | undefined) =>
  v ? format(new Date(v), 'dd MMM yyyy') : '';
const FULL_NAME = (r: RowType) =>
  [r.first_name, r.last_name].filter(Boolean).join(' ') || '—';

export const getStudentsColumns = (): ColumnDef[] => {
  return [
    // Defaults
    {
      id: 'name',
      label: 'Name',
      width: 220,
      sortable: true,
      sortAccessor: (r) =>
        [r.first_name, r.last_name].filter(Boolean).join(' '),
      render: (r) => FULL_NAME(r),
      group: 'Identity',
    },
    {
      id: 'student_id',
      label: 'Student ID',
      width: 160,
      sortable: true,
      sortAccessor: (r) => r.student_id_display || '',
      render: (r) => r.student_id_display || '—',
      group: 'Identity',
    },
    {
      id: 'email',
      label: 'Email',
      width: 240,
      sortable: true,
      sortAccessor: (r) => r.email || '',
      render: (r) => r.email || '—',
      group: 'Identity',
    },
    {
      id: 'status',
      label: 'Status',
      width: 140,
      sortable: true,
      sortAccessor: (r) => r.status as unknown as string,
      render: (r) => (
        <Badge
          variant={
            r.status === 'WITHDRAWN'
              ? 'destructive'
              : r.status === 'ACTIVE'
                ? 'default'
                : 'secondary'
          }
        >
          {r.status}
        </Badge>
      ),
      group: 'Identity',
    },
    {
      id: 'date_of_birth',
      label: 'Date of Birth',
      width: 140,
      sortable: true,
      sortAccessor: (r) =>
        r.date_of_birth ? new Date(r.date_of_birth as string).getTime() : 0,
      render: (r) => FMT_DATE(r.date_of_birth as string | null),
      group: 'Identity',
    },
    {
      id: 'created_at',
      label: 'Created At',
      width: 140,
      sortable: true,
      sortAccessor: (r) =>
        r.created_at ? new Date(r.created_at as string).getTime() : 0,
      render: (r) => FMT_DATE(r.created_at as unknown as string),
      group: 'Metadata',
    },
  ];
};

export const DEFAULT_VISIBLE_COLUMNS = [
  'name',
  'student_id',
  'email',
  'status',
  'created_at',
];
