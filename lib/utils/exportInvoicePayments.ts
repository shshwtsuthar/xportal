import { format as formatDateFn } from 'date-fns';
import {
  getPaymentsColumns,
  getRecordedByName,
  type PaymentsRow,
} from '@/app/(app)/financial/invoices/_components/paymentsTableColumns';

const fmtDate = (v: string | null | undefined): string =>
  v ? formatDateFn(new Date(v), 'dd MMM yyyy') : '—';

const fmtCurrency = (cents: number | null | undefined): string => {
  const dollars = (cents ?? 0) / 100;
  return dollars.toLocaleString('en-AU', {
    style: 'currency',
    currency: 'AUD',
  });
};

const xeroStatusToLabel = (status: string | null | undefined): string => {
  if (!status || status === 'pending') return 'Pending';
  if (status === 'failed') return 'Failed';
  if (status === 'synced') return 'Synced';
  return status;
};

/**
 * Resolve a column value for export by column id.
 * Uses the same logic as the table renderers but returns plain strings/numbers.
 */
const getValueByColumnId = (row: PaymentsRow, id: string): string | number => {
  if (id === 'payment_date') return fmtDate(row.payment_date);
  if (id === 'amount_cents') return fmtCurrency(row.amount_cents);
  if (id === 'method') return row.method ?? '—';
  if (id === 'reconciliation_notes') return row.reconciliation_notes ?? '—';
  if (id === 'xero_sync_status') return xeroStatusToLabel(row.xero_sync_status);
  if (id === 'xero_payment_id') return row.xero_payment_id ?? '—';
  if (id === 'external_ref') return row.external_ref ?? '—';
  if (id === 'recorded_by') return getRecordedByName(row);
  if (id === 'created_at') return fmtDate(row.created_at);
  if (id === 'updated_at') return fmtDate(row.updated_at);

  const anyRow = row as Record<string, unknown>;
  const raw = anyRow[id];
  if (raw === null || raw === undefined) return '—';
  return typeof raw === 'string' || typeof raw === 'number' ? raw : String(raw);
};

/**
 * Prepare export rows and headers using the payments table column definitions.
 * Respects visible column ids when provided (e.g. from user preferences).
 */
export const buildInvoicePaymentsExportTable = (
  rows: PaymentsRow[],
  columnIds?: string[]
) => {
  const allColumns = getPaymentsColumns();
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
 * Generate descriptive file name for invoice payments export.
 */
export const generateInvoicePaymentsFileName = (
  ext: 'csv' | 'xlsx',
  count: number,
  invoiceNumber?: string | null
): string => {
  const slug = invoiceNumber
    ? String(invoiceNumber).replace(/[^a-zA-Z0-9-]/g, '-')
    : 'payments';
  const ts = formatDateFn(new Date(), 'yyyy-MM-dd-HHmmss');
  return `invoice-payments-${slug}-${count}-records-${ts}.${ext}`;
};

/**
 * Export invoice payments to CSV. Adds BOM for Excel compatibility.
 */
export const exportInvoicePaymentsToCSV = async (
  rows: PaymentsRow[],
  invoiceNumber?: string | null,
  columnIds?: string[]
) => {
  const Papa = (await import('papaparse')).default;
  const { headers, data } = buildInvoicePaymentsExportTable(rows, columnIds);
  const csv = Papa.unparse({ fields: headers, data });
  const blob = new Blob(['\uFEFF' + csv], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = generateInvoicePaymentsFileName(
    'csv',
    rows.length,
    invoiceNumber
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Export invoice payments to XLSX using SheetJS.
 */
export const exportInvoicePaymentsToXLSX = async (
  rows: PaymentsRow[],
  invoiceNumber?: string | null,
  columnIds?: string[]
) => {
  const XLSX = await import('xlsx');
  const { headers, data } = buildInvoicePaymentsExportTable(rows, columnIds);
  const aoa = [headers, ...data];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Payments');
  XLSX.writeFile(
    wb,
    generateInvoicePaymentsFileName('xlsx', rows.length, invoiceNumber)
  );
};
