import type { DataTableColumnDef } from './types';

/**
 * Convert old column definition format to new TanStack Table format
 */
export const convertColumnDef = <T>(oldColumn: {
  id: string;
  label: string;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  sortable?: boolean;
  sortAccessor?: (row: T) => string | number;
  render: (row: T) => React.ReactNode;
  group?: string;
  noTruncate?: boolean;
}): DataTableColumnDef<T> => {
  const columnDef: DataTableColumnDef<T> = {
    id: oldColumn.id,
    header: oldColumn.label,
    defaultWidth: oldColumn.width,
    minWidth: oldColumn.minWidth,
    maxWidth: oldColumn.maxWidth,
    enableSorting: oldColumn.sortable !== false,
    cell: ({ row }) => oldColumn.render(row.original),
    group: oldColumn.group,
    noTruncate: oldColumn.noTruncate,
  };

  // If sortAccessor is provided, use it for sorting via accessorFn
  // The custom cell renderer will handle the display, so accessorFn is only used for sorting/filtering
  if (oldColumn.sortAccessor) {
    (
      columnDef as DataTableColumnDef<T> & { accessorFn: (row: T) => unknown }
    ).accessorFn = (row: T) => oldColumn.sortAccessor!(row);
  } else {
    // Try to use accessorKey if the column id might match a field
    // This allows TanStack Table to access the field directly for sorting/filtering
    (columnDef as DataTableColumnDef<T> & { accessorKey: string }).accessorKey =
      oldColumn.id;
  }

  return columnDef;
};

/**
 * Convert array of old column definitions to new format
 */
export const convertColumnDefs = <T>(
  oldColumns: Array<{
    id: string;
    label: string;
    width?: number;
    minWidth?: number;
    maxWidth?: number;
    sortable?: boolean;
    sortAccessor?: (row: T) => string | number;
    render: (row: T) => React.ReactNode;
    group?: string;
    noTruncate?: boolean;
  }>
): DataTableColumnDef<T>[] => {
  return oldColumns.map(convertColumnDef);
};
