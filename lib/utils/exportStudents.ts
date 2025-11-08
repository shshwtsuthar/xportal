import type { Tables } from '@/database.types';
import { format as formatDateFn } from 'date-fns';
import { getStudentsColumns } from '@/app/(app)/students/_components/studentsTableColumns';
import type { StudentFilters } from '@/src/hooks/useStudentsFilters';

type RowType = Tables<'students'>;

const fmtDate = (v: string | null | undefined): string =>
  v ? formatDateFn(new Date(v), 'dd MMM yyyy') : '';

/**
 * Resolve a column value for export by column id.
 * Falls back to raw row field when applicable.
 */
const getValueByColumnId = (row: RowType, id: string): string | number => {
  // Computed columns
  if (id === 'name') {
    const first = row.first_name || '';
    const last = row.last_name || '';
    const name = [first, last].filter(Boolean).join(' ');
    return name || '—';
  }
  if (id === 'student_id') return row.student_id_display || '—';
  if (id === 'email') return row.email || '—';
  if (id === 'status') return String(row.status ?? '');
  if (id === 'date_of_birth')
    return fmtDate(row.date_of_birth as string | null);
  if (id === 'created_at') return fmtDate(row.created_at as unknown as string);

  // Default: try raw field by id
  const anyRow = row as Record<string, unknown>;
  const raw = anyRow[id];
  if (raw === null || raw === undefined) return '—';
  return typeof raw === 'string' || typeof raw === 'number' ? raw : String(raw);
};

/**
 * Prepare export rows and headers using the table column definitions.
 * Includes ALL columns regardless of user visibility.
 */
export const buildExportTable = (rows: RowType[]) => {
  const columns = getStudentsColumns();
  const headers = columns.map((c) => c.label);
  const ids = columns.map((c) => c.id);
  const data = rows.map((row) => ids.map((id) => getValueByColumnId(row, id)));
  return { headers, data };
};

/**
 * Generate descriptive file name using filters and metadata.
 */
export const generateFileName = (
  ext: 'csv' | 'xlsx',
  count: number,
  filters?: StudentFilters
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
  return `students-${segment}-${count}-records-${ts}.${ext}`;
};

/**
 * Export to CSV using PapaParse. Adds BOM for Excel compatibility.
 */
export const exportToCSV = async (
  rows: RowType[],
  filters?: StudentFilters
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

/**
 * Export to XLSX using SheetJS.
 */
export const exportToXLSX = async (
  rows: RowType[],
  filters?: StudentFilters
) => {
  const XLSX = await import('xlsx');
  const { headers, data } = buildExportTable(rows);
  const aoa = [headers, ...data];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Students');
  XLSX.writeFile(wb, generateFileName('xlsx', rows.length, filters));
};
