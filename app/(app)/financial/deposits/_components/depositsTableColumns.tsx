'use client';

import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import type { Tables } from '@/database.types';

export type RowType = Tables<'application_invoices'> & {
  applications?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    student_id_display: string | null;
    program_id: string | null;
    programs?: Pick<Tables<'programs'>, 'name' | 'code' | 'id'> | null;
  } | null;
};

export type ColumnDef = {
  id: string;
  label: string;
  width?: number;
  minWidth?: number;
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
  const app = r.applications;
  return [app?.first_name, app?.last_name].filter(Boolean).join(' ') || '—';
};

const statusBadge = (status: string) => {
  if (status === 'VOID') return <Badge variant="secondary">Void</Badge>;
  if (status === 'SCHEDULED')
    return <Badge variant="secondary">Scheduled</Badge>;
  return <Badge variant="secondary">{status}</Badge>;
};

const paymentStatusBadge = (status: string) => {
  if (status === 'PAID_CONFIRMED') {
    return <Badge variant="default">Paid (Xero confirmed)</Badge>;
  }
  if (status === 'PAID_INTERNAL') {
    return <Badge variant="secondary">Paid (internal only)</Badge>;
  }
  if (status === 'PARTIALLY_PAID') {
    return <Badge variant="secondary">Partially paid</Badge>;
  }
  return <Badge variant="secondary">Unpaid</Badge>;
};

export const getDepositsColumns = (): ColumnDef[] => {
  return [
    // Defaults
    {
      id: 'invoice_number',
      label: 'Invoice #',
      width: 140,
      minWidth: 80,
      sortable: true,
      sortAccessor: (r) => r.invoice_number,
      render: (r) => r.invoice_number,
      group: 'Identity',
    },
    {
      id: 'student_name',
      label: 'Student Name',
      width: 220,
      minWidth: 120,
      sortable: true,
      sortAccessor: (r) => fullName(r),
      render: (r) => fullName(r),
      group: 'Student',
    },
    {
      id: 'student_id_display',
      label: 'Student ID',
      width: 140,
      minWidth: 90,
      sortable: true,
      sortAccessor: (r) => r.applications?.student_id_display || '',
      render: (r) => r.applications?.student_id_display || '—',
      group: 'Student',
    },
    {
      id: 'program',
      label: 'Program',
      width: 220,
      minWidth: 140,
      sortable: true,
      sortAccessor: (r) => r.applications?.programs?.name || '',
      render: (r) => r.applications?.programs?.name || '—',
      group: 'Program',
    },
    {
      id: 'issue_date',
      label: 'Issue Date',
      width: 140,
      minWidth: 90,
      sortable: true,
      sortAccessor: (r) =>
        r.issue_date ? new Date(r.issue_date).getTime() : 0,
      render: (r) => fmtDate(r.issue_date),
      group: 'Dates',
    },
    {
      id: 'due_date',
      label: 'Due Date',
      width: 140,
      minWidth: 90,
      sortable: true,
      sortAccessor: (r) => (r.due_date ? new Date(r.due_date).getTime() : 0),
      render: (r) => fmtDate(r.due_date),
      group: 'Dates',
    },
    {
      id: 'status',
      label: 'Status',
      width: 140,
      minWidth: 90,
      sortable: true,
      sortAccessor: (r) => (r.status as unknown as string) || '',
      render: (r) => statusBadge(String(r.status || '')),
      group: 'Identity',
    },
    {
      id: 'internal_payment_status',
      label: 'Payment Status',
      width: 180,
      minWidth: 120,
      sortable: true,
      sortAccessor: (r) =>
        (r.internal_payment_status as unknown as string) || '',
      render: (r) =>
        paymentStatusBadge(String(r.internal_payment_status || 'UNPAID')),
      group: 'Amounts',
    },
    {
      id: 'amount_due_cents',
      label: 'Amount Due',
      width: 140,
      minWidth: 90,
      sortable: true,
      sortAccessor: (r) => r.amount_due_cents ?? 0,
      render: (r) => fmtCurrency(r.amount_due_cents),
      group: 'Amounts',
    },
    {
      id: 'amount_paid_cents',
      label: 'Amount Paid',
      width: 140,
      minWidth: 90,
      sortable: true,
      sortAccessor: (r) => r.amount_paid_cents ?? 0,
      render: (r) => fmtCurrency(r.amount_paid_cents),
      group: 'Amounts',
    },
    {
      id: 'balance_cents',
      label: 'Balance',
      width: 140,
      minWidth: 90,
      sortable: true,
      sortAccessor: (r) =>
        (r.amount_due_cents ?? 0) - (r.amount_paid_cents ?? 0),
      render: (r) =>
        fmtCurrency((r.amount_due_cents ?? 0) - (r.amount_paid_cents ?? 0)),
      group: 'Amounts',
    },
    {
      id: 'last_email_sent_at',
      label: 'Last Emailed',
      width: 160,
      minWidth: 110,
      sortable: true,
      sortAccessor: (r) =>
        r.last_email_sent_at ? new Date(r.last_email_sent_at).getTime() : 0,
      render: (r) => fmtDate(r.last_email_sent_at),
      group: 'Comms',
    },
    {
      id: 'pdf_path',
      label: 'PDF',
      width: 120,
      minWidth: 80,
      sortable: true,
      sortAccessor: (r) => (r.pdf_path ? 1 : 0),
      render: (r) => (r.pdf_path ? 'Available' : '—'),
      group: 'Comms',
    },
    // Identity
    {
      id: 'id',
      label: 'ID',
      width: 260,
      minWidth: 160,
      sortable: true,
      sortAccessor: (r) => r.id,
      render: (r) => r.id,
      group: 'Identity',
    },
  ];
};

export const DEFAULT_VISIBLE_COLUMNS = [
  'invoice_number',
  'student_name',
  'student_id_display',
  'program',
  'issue_date',
  'due_date',
  'amount_due_cents',
  'internal_payment_status',
  'status',
];
