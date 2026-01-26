import type { Tables } from '@/database.types';
import { format as formatDateFn } from 'date-fns';
import { getInvoicesColumns } from '@/app/(app)/financial/invoices/_components/invoicesTableColumns';
import type { InvoiceFilters } from '@/src/hooks/useInvoicesFilters';

type RowType = Tables<'enrollment_invoices'> & {
  enrollments?: {
    student_id: string;
    program_id: string;
    students?: Pick<
      Tables<'students'>,
      'first_name' | 'last_name' | 'student_id_display' | 'id'
    > | null;
    programs?: Pick<Tables<'programs'>, 'name' | 'code' | 'id'> | null;
  } | null;
};

const fmtDate = (v: string | null | undefined): string =>
  v ? formatDateFn(new Date(v), 'dd MMM yyyy') : '';

const fmtCurrency = (cents: number | null | undefined): string => {
  return `$${((cents ?? 0) / 100).toFixed(2)}`;
};

const getValueByColumnId = (row: RowType, id: string): string | number => {
  if (id === 'student_name') {
    const s = row.enrollments?.students;
    const name = [s?.first_name, s?.last_name].filter(Boolean).join(' ');
    return name || '—';
  }
  if (id === 'student_id_display')
    return row.enrollments?.students?.student_id_display || '—';
  if (id === 'program') return row.enrollments?.programs?.name || '—';
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

  const anyRow = row as Record<string, unknown>;
  const raw = anyRow[id];
  if (raw === null || raw === undefined) return '—';
  return typeof raw === 'string' || typeof raw === 'number' ? raw : String(raw);
};

export const buildExportTable = (rows: RowType[]) => {
  const columns = getInvoicesColumns();
  const headers = columns.map((c) => c.label);
  const ids = columns.map((c) => c.id);
  const data = rows.map((row) => ids.map((id) => getValueByColumnId(row, id)));
  return { headers, data };
};

export const generateFileName = (
  ext: 'csv' | 'xlsx',
  count: number,
  filters?: InvoiceFilters
): string => {
  let segment = 'all';
  if (filters && Object.keys(filters).length > 0) {
    const onlyStatus =
      filters.statuses?.length === 1 &&
      Object.keys(filters)
        .filter((k) => (filters as Record<string, unknown>)[k] !== undefined)
        .every((k) => k === 'statuses');
    if (onlyStatus) {
      segment = String(filters.statuses?.[0] || 'filtered').toLowerCase();
    } else {
      segment = 'filtered';
    }
  }
  const ts = formatDateFn(new Date(), 'yyyy-MM-dd-HHmmss');
  return `invoices-${segment}-${count}-records-${ts}.${ext}`;
};

export const exportInvoicesToCSV = async (
  rows: RowType[],
  filters?: InvoiceFilters
) => {
  const Papa = (await import('papaparse')).default;
  const { headers, data } = buildExportTable(rows);
  const csv = Papa.unparse({ fields: headers, data });
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = generateFileName('csv', rows.length, filters);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportInvoicesToXLSX = async (
  rows: RowType[],
  filters?: InvoiceFilters
) => {
  const XLSX = await import('xlsx');
  const { headers, data } = buildExportTable(rows);
  const aoa = [headers, ...data];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Invoices');
  XLSX.writeFile(wb, generateFileName('xlsx', rows.length, filters));
};
