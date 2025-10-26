import type { Tables } from '@/database.types';
import { format as formatDateFn } from 'date-fns';
import { getApplicationsColumns } from '@/app/(app)/applications/_components/applicationsTableColumns';
import type { ApplicationFilters } from '@/src/hooks/useApplicationsFilters';

type RowType = Tables<'applications'> & {
  agents?: Pick<Tables<'agents'>, 'name'> | null;
  programs?: Pick<Tables<'programs'>, 'name'> | null;
};

const toYesNo = (v: unknown): string => (v ? 'Yes' : 'No');
const fmtDate = (v: string | null | undefined): string =>
  v ? formatDateFn(new Date(v), 'dd MMM yyyy') : '';

const statusToLabel = (status: Tables<'applications'>['status']): string => {
  switch (status as unknown as string) {
    case 'OFFER_GENERATED':
      return 'Offer Generated';
    case 'OFFER_SENT':
      return 'Offer Sent';
    case 'ACCEPTED':
      return 'Accepted';
    case 'DRAFT':
      return 'Draft';
    case 'SUBMITTED':
      return 'Submitted';
    case 'REJECTED':
      return 'Rejected';
    case 'APPROVED':
      return 'Approved';
    default:
      return String(status ?? '');
  }
};

/**
 * Resolve a column value for export by column id.
 * Falls back to raw row field when applicable.
 */
const getValueByColumnId = (row: RowType, id: string): string | number => {
  // Computed columns
  if (id === 'student_name') {
    const first = row.first_name || '';
    const last = row.last_name || '';
    const name = [first, last].filter(Boolean).join(' ');
    return name || '—';
  }
  if (id === 'agent') return row.agents?.name || '—';
  if (id === 'program') return row.programs?.name || '—';
  if (id === 'status')
    return statusToLabel(
      row.status as unknown as Tables<'applications'>['status']
    );
  if (id === 'requested_start')
    return fmtDate(row.requested_start_date as string | null);
  if (id === 'proposed_commencement')
    return fmtDate(row.proposed_commencement_date as string | null);
  if (id === 'updated_at') return fmtDate(row.updated_at as unknown as string);
  if (id === 'created_at') return fmtDate(row.created_at as unknown as string);
  if (id === 'date_of_birth')
    return fmtDate(row.date_of_birth as string | null);
  if (id === 'payment_anchor_date')
    return fmtDate(row.payment_anchor_date as string | null);
  if (id === 'offer_generated_at')
    return fmtDate(row.offer_generated_at as string | null);
  if (id === 'timetable_id') return toYesNo(row.timetable_id);
  if (id === 'payment_plan_template_id')
    return toYesNo(row.payment_plan_template_id);
  if (id === 'postal_is_same_as_street')
    return toYesNo(row.postal_is_same_as_street);
  if (id === 'is_international') return toYesNo(row.is_international);

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
  const columns = getApplicationsColumns();
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
  filters?: ApplicationFilters
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
  return `applications-${segment}-${count}-records-${ts}.${ext}`;
};

/**
 * Export to CSV using PapaParse. Adds BOM for Excel compatibility.
 */
export const exportToCSV = async (
  rows: RowType[],
  filters?: ApplicationFilters
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
  filters?: ApplicationFilters
) => {
  const XLSX = await import('xlsx');
  const { headers, data } = buildExportTable(rows);
  const aoa = [headers, ...data];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Applications');
  XLSX.writeFile(wb, generateFileName('xlsx', rows.length, filters));
};
