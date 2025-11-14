'use client';

import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import type { Tables } from '@/database.types';

export type RowType = Tables<'commission_invoices'> & {
  agents?: Pick<Tables<'agents'>, 'name' | 'id'> | null;
  students?: Pick<
    Tables<'students'>,
    'first_name' | 'last_name' | 'student_id_display' | 'id'
  > | null;
};

export type ColumnDef = {
  id: string;
  label: string;
  width?: number;
  sortable?: boolean;
  sortAccessor?: (row: RowType) => string | number;
  render: (row: RowType) => React.ReactNode;
  group?: string;
};

const fmtCurrency = (cents: number | null | undefined) => {
  const dollars = ((cents ?? 0) / 100).toFixed(2);
  return `$${dollars}`;
};

const fmtDate = (v: string | null | undefined) =>
  v ? format(new Date(v), 'dd MMM yyyy') : '';

const fullName = (r: RowType) => {
  const s = r.students;
  return [s?.first_name, s?.last_name].filter(Boolean).join(' ') || '—';
};

const statusBadge = (status: string) => {
  if (status === 'PAID') return <Badge variant="default">Paid</Badge>;
  if (status === 'CANCELLED')
    return <Badge variant="secondary">Cancelled</Badge>;
  if (status === 'UNPAID') return <Badge variant="destructive">Unpaid</Badge>;
  return <Badge variant="secondary">{status}</Badge>;
};

export const getCommissionsColumns = (): ColumnDef[] => {
  return [
    {
      id: 'invoice_number',
      label: 'Commission #',
      width: 160,
      sortable: true,
      sortAccessor: (r) => r.invoice_number,
      render: (r) => r.invoice_number,
      group: 'Identity',
    },
    {
      id: 'issue_date',
      label: 'Issue Date',
      width: 140,
      sortable: true,
      sortAccessor: (r) =>
        r.issue_date ? new Date(r.issue_date).getTime() : 0,
      render: (r) => fmtDate(r.issue_date),
      group: 'Dates',
    },
    {
      id: 'agent_name',
      label: 'Agent',
      width: 200,
      sortable: true,
      sortAccessor: (r) => r.agents?.name || '',
      render: (r) => r.agents?.name || '—',
      group: 'Agent',
    },
    {
      id: 'student_name',
      label: 'Student Name',
      width: 200,
      sortable: true,
      sortAccessor: (r) => fullName(r),
      render: (r) => fullName(r),
      group: 'Student',
    },
    {
      id: 'student_id_display',
      label: 'Student ID',
      width: 140,
      sortable: true,
      sortAccessor: (r) => r.students?.student_id_display || '',
      render: (r) => r.students?.student_id_display || '—',
      group: 'Student',
    },
    {
      id: 'base_amount_cents',
      label: 'Base Amount',
      width: 140,
      sortable: true,
      sortAccessor: (r) => r.base_amount_cents ?? 0,
      render: (r) => fmtCurrency(r.base_amount_cents),
      group: 'Amounts',
    },
    {
      id: 'gst_amount_cents',
      label: 'GST',
      width: 120,
      sortable: true,
      sortAccessor: (r) => r.gst_amount_cents ?? 0,
      render: (r) => fmtCurrency(r.gst_amount_cents),
      group: 'Amounts',
    },
    {
      id: 'total_amount_cents',
      label: 'Total Due',
      width: 140,
      sortable: true,
      sortAccessor: (r) => r.total_amount_cents ?? 0,
      render: (r) => fmtCurrency(r.total_amount_cents),
      group: 'Amounts',
    },
    {
      id: 'amount_paid_cents',
      label: 'Amount Paid',
      width: 140,
      sortable: true,
      sortAccessor: (r) => r.amount_paid_cents ?? 0,
      render: (r) => fmtCurrency(r.amount_paid_cents),
      group: 'Amounts',
    },
    {
      id: 'status',
      label: 'Status',
      width: 120,
      sortable: true,
      sortAccessor: (r) => (r.status as unknown as string) || '',
      render: (r) => statusBadge(String(r.status || '')),
      group: 'Identity',
    },
    {
      id: 'commission_rate_applied',
      label: 'Rate (%)',
      width: 100,
      sortable: true,
      sortAccessor: (r) => Number(r.commission_rate_applied) || 0,
      render: (r) => `${Number(r.commission_rate_applied).toFixed(2)}%`,
      group: 'Details',
    },
  ];
};

export const DEFAULT_VISIBLE_COLUMNS = [
  'invoice_number',
  'issue_date',
  'agent_name',
  'student_name',
  'base_amount_cents',
  'gst_amount_cents',
  'total_amount_cents',
  'amount_paid_cents',
  'status',
];
