'use client';

import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import type { Tables } from '@/database.types';

export type PaymentsRow = Tables<'payments'> & {
  recorded_by_profile?: Pick<
    Tables<'profiles'>,
    'first_name' | 'last_name'
  > | null;
};

export const getRecordedByName = (row: PaymentsRow): string => {
  const p = row.recorded_by_profile;
  if (p && (p.first_name || p.last_name)) {
    return [p.first_name, p.last_name].filter(Boolean).join(' ') ?? '—';
  }
  return row.recorded_by ?? '—';
};

export type ColumnDef = {
  id: string;
  label: string;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  sortable?: boolean;
  sortAccessor?: (row: PaymentsRow) => string | number;
  render: (row: PaymentsRow) => React.ReactNode;
  group?: string;
  noTruncate?: boolean;
};

const formatDate = (value: string | null | undefined) => {
  if (!value) return '—';
  try {
    return format(new Date(value), 'dd MMM yyyy');
  } catch {
    return value;
  }
};

const formatCurrency = (cents: number | null | undefined) => {
  const dollars = (cents ?? 0) / 100;
  return dollars.toLocaleString('en-AU', {
    style: 'currency',
    currency: 'AUD',
  });
};

const renderXeroStatus = (status: string | null) => {
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

export const getPaymentsColumns = (): ColumnDef[] => [
  {
    id: 'payment_date',
    label: 'Payment Date',
    width: 140,
    minWidth: 110,
    sortable: true,
    sortAccessor: (row) =>
      row.payment_date ? new Date(row.payment_date).getTime() : 0,
    render: (row) => formatDate(row.payment_date),
    group: 'Payment',
  },
  {
    id: 'amount_cents',
    label: 'Amount',
    width: 140,
    minWidth: 110,
    sortable: true,
    sortAccessor: (row) => row.amount_cents ?? 0,
    render: (row) => formatCurrency(row.amount_cents),
    group: 'Payment',
  },
  {
    id: 'method',
    label: 'Method',
    width: 140,
    minWidth: 110,
    sortable: true,
    sortAccessor: (row) => row.method ?? '',
    render: (row) => row.method ?? '—',
    group: 'Payment',
  },
  {
    id: 'reconciliation_notes',
    label: 'Reconciliation Notes',
    width: 260,
    minWidth: 180,
    sortable: false,
    render: (row) => (
      <span className="text-muted-foreground text-sm">
        {row.reconciliation_notes ?? '—'}
      </span>
    ),
    group: 'Details',
    noTruncate: true,
  },
  {
    id: 'xero_sync_status',
    label: 'Xero Status',
    width: 140,
    minWidth: 120,
    sortable: true,
    sortAccessor: (row) => row.xero_sync_status ?? 'pending',
    render: (row) => renderXeroStatus(row.xero_sync_status),
    group: 'Xero',
  },
  {
    id: 'xero_payment_id',
    label: 'Xero Payment ID',
    width: 220,
    minWidth: 160,
    sortable: true,
    sortAccessor: (row) => row.xero_payment_id ?? '',
    render: (row) => row.xero_payment_id ?? '—',
    group: 'Xero',
    noTruncate: true,
  },
  {
    id: 'external_ref',
    label: 'External Ref',
    width: 200,
    minWidth: 160,
    sortable: true,
    sortAccessor: (row) => row.external_ref ?? '',
    render: (row) => row.external_ref ?? '—',
    group: 'Details',
    noTruncate: true,
  },
  {
    id: 'recorded_by',
    label: 'Recorded By',
    width: 180,
    minWidth: 140,
    sortable: true,
    sortAccessor: (row) => getRecordedByName(row),
    render: (row) => getRecordedByName(row),
    group: 'Audit',
  },
  {
    id: 'created_at',
    label: 'Created At',
    width: 180,
    minWidth: 140,
    sortable: true,
    sortAccessor: (row) =>
      row.created_at ? new Date(row.created_at).getTime() : 0,
    render: (row) => formatDate(row.created_at),
    group: 'Audit',
  },
  {
    id: 'updated_at',
    label: 'Updated At',
    width: 180,
    minWidth: 140,
    sortable: true,
    sortAccessor: (row) =>
      row.updated_at ? new Date(row.updated_at).getTime() : 0,
    render: (row) => formatDate(row.updated_at),
    group: 'Audit',
  },
];

export const DEFAULT_VISIBLE_COLUMNS = [
  'payment_date',
  'amount_cents',
  'method',
  'reconciliation_notes',
  'xero_sync_status',
];
