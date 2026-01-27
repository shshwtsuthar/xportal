import { format as formatDateFn } from 'date-fns';
import {
  getDepositsColumns,
  type RowType,
} from '@/app/(app)/financial/deposits/_components/depositsTableColumns';
import type { DepositFilters } from '@/src/hooks/useDepositsFilters';

const fmtDate = (v: string | null | undefined): string =>
  v ? formatDateFn(new Date(v), 'dd MMM yyyy') : '';

const fmtCurrency = (cents: number | null | undefined): string => {
  const dollars = ((cents ?? 0) / 100).toFixed(2);
  return `$${dollars}`;
};

const fullName = (r: RowType): string => {
  const app = r.applications;
  return [app?.first_name, app?.last_name].filter(Boolean).join(' ') || '—';
};

const statusToLabel = (status: string): string => {
  if (status === 'VOID') return 'Void';
  if (status === 'SCHEDULED') return 'Scheduled';
  return status || '—';
};

const paymentStatusToLabel = (status: string): string => {
  if (status === 'PAID_CONFIRMED') return 'Paid (Xero confirmed)';
  if (status === 'PAID_INTERNAL') return 'Paid (internal only)';
  if (status === 'PARTIALLY_PAID') return 'Partially paid';
  return 'Unpaid';
};

/**
 * Resolve a column value for export by column id.
 * Uses the same logic as the table renderers but returns plain strings/numbers.
 */
const getValueByColumnId = (row: RowType, id: string): string | number => {
  if (id === 'student_name') return fullName(row);
  if (id === 'student_id_display')
    return row.applications?.student_id_display ?? '—';
  if (id === 'program') return row.applications?.programs?.name ?? '—';
  if (id === 'status') return statusToLabel(String(row.status ?? ''));
  if (id === 'internal_payment_status')
    return paymentStatusToLabel(
      String(row.internal_payment_status ?? 'UNPAID')
    );
  if (id === 'issue_date') return fmtDate(row.issue_date);
  if (id === 'due_date') return fmtDate(row.due_date);
  if (id === 'amount_due_cents') return fmtCurrency(row.amount_due_cents);
  if (id === 'amount_paid_cents') return fmtCurrency(row.amount_paid_cents);
  if (id === 'balance_cents')
    return fmtCurrency(
      (row.amount_due_cents ?? 0) - (row.amount_paid_cents ?? 0)
    );
  if (id === 'last_email_sent_at') return fmtDate(row.last_email_sent_at);
  if (id === 'pdf_path') return row.pdf_path ? 'Available' : '—';

  // invoice_number, id: use raw field
  const anyRow = row as Record<string, unknown>;
  const raw = anyRow[id];
  if (raw === null || raw === undefined) return '—';
  return typeof raw === 'string' || typeof raw === 'number' ? raw : String(raw);
};

/**
 * Prepare export rows and headers using the deposits table column definitions.
 * Respects visible column ids when provided (e.g. from user preferences).
 */
export const buildDepositsExportTable = (
  rows: RowType[],
  columnIds?: string[]
) => {
  const allColumns = getDepositsColumns();
  const columnMap = new Map(allColumns.map((c) => [c.id, c]));

  const resolvedColumns = columnIds?.length
    ? (columnIds
        .map((id) => columnMap.get(id))
        .filter(Boolean) as typeof allColumns)
    : allColumns;

  const columns = resolvedColumns.length > 0 ? resolvedColumns : allColumns;

  const headers = columns.map((c) => c.label);
  const ids = columns.map((c) => c.id);
  const data = rows.map((row) => ids.map((id) => getValueByColumnId(row, id)));
  return { headers, data };
};

/**
 * Generate descriptive file name for deposits export.
 */
export const generateDepositsFileName = (
  ext: 'csv' | 'xlsx',
  count: number,
  filters?: DepositFilters
): string => {
  let segment = 'all';
  if (filters && Object.keys(filters).length > 0) {
    const definedKeys = Object.keys(filters).filter(
      (k) => (filters as Record<string, unknown>)[k] !== undefined
    );
    const onlyStatus =
      filters.statuses?.length === 1 &&
      definedKeys.every((k) => k === 'statuses');
    const onlyInternal =
      filters.internalPaymentStatuses?.length === 1 &&
      definedKeys.every((k) => k === 'internalPaymentStatuses');
    if (onlyStatus && filters.statuses?.[0]) {
      segment = String(filters.statuses[0]).toLowerCase();
    } else if (onlyInternal && filters.internalPaymentStatuses?.[0]) {
      segment = String(filters.internalPaymentStatuses[0]).toLowerCase();
    } else {
      segment = 'filtered';
    }
  }
  const ts = formatDateFn(new Date(), 'yyyy-MM-dd-HHmmss');
  return `deposits-${segment}-${count}-records-${ts}.${ext}`;
};

/**
 * Export deposits to CSV. Adds BOM for Excel compatibility.
 */
export const exportDepositsToCSV = async (
  rows: RowType[],
  filters?: DepositFilters,
  columnIds?: string[]
) => {
  const Papa = (await import('papaparse')).default;
  const { headers, data } = buildDepositsExportTable(rows, columnIds);
  const csv = Papa.unparse({ fields: headers, data });
  const blob = new Blob(['\uFEFF' + csv], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = generateDepositsFileName('csv', rows.length, filters);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Export deposits to XLSX using SheetJS.
 */
export const exportDepositsToXLSX = async (
  rows: RowType[],
  filters?: DepositFilters,
  columnIds?: string[]
) => {
  const XLSX = await import('xlsx');
  const { headers, data } = buildDepositsExportTable(rows, columnIds);
  const aoa = [headers, ...data];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Deposits');
  XLSX.writeFile(wb, generateDepositsFileName('xlsx', rows.length, filters));
};
