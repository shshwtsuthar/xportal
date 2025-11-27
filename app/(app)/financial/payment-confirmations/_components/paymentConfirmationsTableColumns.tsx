'use client';

import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import type { PaymentRow } from '@/src/hooks/useGetUnconfirmedPayments';

export type RowType = PaymentRow;

export type ColumnDef = {
  id: string;
  label: string;
  width?: number;
  sortable?: boolean;
  sortAccessor?: (row: RowType) => string | number;
  render: (row: RowType) => ReactNode;
};

const fmtDate = (value: string | null | undefined) => {
  if (!value) return '—';
  try {
    return format(new Date(value), 'dd MMM yyyy');
  } catch {
    return value;
  }
};

const fmtCurrency = (cents: number | null | undefined) => {
  const dollars = (cents ?? 0) / 100;
  return dollars.toLocaleString('en-AU', {
    style: 'currency',
    currency: 'AUD',
  });
};

const getStudentName = (row: RowType) => {
  const student = row.invoices?.enrollments?.students;
  const first = student?.first_name ?? '';
  const last = student?.last_name ?? '';
  const full = `${first} ${last}`.trim();
  return full || 'Unknown student';
};

const renderStatus = (status: string | null) => {
  if (!status || status === 'pending') {
    return <Badge variant="outline">Pending</Badge>;
  }
  if (status === 'failed') {
    return <Badge variant="destructive">Failed</Badge>;
  }
  if (status === 'synced') {
    return <Badge variant="default">Synced</Badge>;
  }
  return <Badge variant="secondary">{status}</Badge>;
};

export const getPaymentConfirmationsColumns = (): ColumnDef[] => [
  {
    id: 'student',
    label: 'Student',
    width: 240,
    sortable: true,
    sortAccessor: (row) => getStudentName(row),
    render: (row) => {
      const student = row.invoices?.enrollments?.students;
      return (
        <div className="flex flex-col">
          <span className="font-medium">{getStudentName(row)}</span>
          {student?.student_id_display && (
            <span className="text-muted-foreground text-xs">
              {student.student_id_display}
            </span>
          )}
        </div>
      );
    },
  },
  {
    id: 'invoice',
    label: 'Invoice',
    width: 200,
    sortable: true,
    sortAccessor: (row) => row.invoices?.invoice_number ?? '',
    render: (row) => (
      <div className="flex flex-col">
        <span className="font-mono text-xs">
          {row.invoices?.invoice_number ?? '—'}
        </span>
        <span className="text-muted-foreground text-xs">
          Due {fmtDate(row.invoices?.due_date)}
        </span>
      </div>
    ),
  },
  {
    id: 'payment_date',
    label: 'Payment Date',
    width: 140,
    sortable: true,
    sortAccessor: (row) =>
      row.payment_date ? new Date(row.payment_date).getTime() : 0,
    render: (row) => fmtDate(row.payment_date as string),
  },
  {
    id: 'amount_cents',
    label: 'Amount',
    width: 140,
    sortable: true,
    sortAccessor: (row) => row.amount_cents ?? 0,
    render: (row) => fmtCurrency(row.amount_cents),
  },
  {
    id: 'method',
    label: 'Method',
    width: 120,
    sortable: true,
    sortAccessor: (row) => row.method ?? '',
    render: (row) => row.method ?? '—',
  },
  {
    id: 'notes',
    label: 'Notes',
    width: 240,
    sortable: false,
    render: (row) => (
      <span className="text-muted-foreground text-sm">
        {row.reconciliation_notes ?? '—'}
      </span>
    ),
  },
  {
    id: 'xero_sync_status',
    label: 'Xero Status',
    width: 140,
    sortable: true,
    sortAccessor: (row) => row.xero_sync_status ?? 'pending',
    render: (row) => renderStatus(row.xero_sync_status as string | null),
  },
];

export const DEFAULT_VISIBLE_COLUMNS = [
  'student',
  'invoice',
  'payment_date',
  'amount_cents',
  'method',
  'xero_sync_status',
];
