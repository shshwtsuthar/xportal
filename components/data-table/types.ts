import type {
  ColumnDef,
  Table as TanStackTable,
  SortingState,
  ColumnFiltersState,
  RowSelectionState,
  Row,
} from '@tanstack/react-table';
import type { ReactNode } from 'react';

/**
 * Extended column definition that adds custom properties
 * while maintaining compatibility with TanStack Table
 */
export type DataTableColumnDef<T> = ColumnDef<T> & {
  id: string;
  group?: string;
  noTruncate?: boolean;
  minWidth?: number;
  maxWidth?: number;
  defaultWidth?: number;
};

/**
 * Row selection mode
 */
export type RowSelectionMode = 'single' | 'multi' | 'none';

/**
 * Export format options
 */
export type ExportFormat = 'csv' | 'xlsx';

/**
 * Props for the main DataTable component
 */
export type DataTableProps<T> = {
  // Data
  data: T[];
  columns: DataTableColumnDef<T>[];
  isLoading?: boolean;
  error?: Error | null;

  // Features
  enableSorting?: boolean;
  enableFiltering?: boolean;
  enableColumnResizing?: boolean;
  enableColumnReordering?: boolean;
  enableRowSelection?: boolean;
  enableRowReordering?: boolean;
  enableExport?: boolean;
  enablePagination?: boolean;
  enableGlobalSearch?: boolean;

  // Configuration
  defaultVisibleColumns?: string[];
  defaultPageSize?: number;
  pageSizeOptions?: number[];
  tableKey?: string; // For preferences persistence
  rowSelectionMode?: RowSelectionMode;

  // Callbacks
  onRowClick?: (row: Row<T>) => void;
  onRowSelect?: (selectedRows: T[]) => void;
  onSortChange?: (sorting: SortingState) => void;
  onFilterChange?: (filters: ColumnFiltersState) => void;

  // Custom renderers
  renderActions?: (row: T) => ReactNode;
  renderToolbar?: () => ReactNode;
  renderEmptyState?: () => ReactNode;
  renderErrorState?: (error: Error) => ReactNode;

  // Export
  exportFormats?: ExportFormat[];
  getExportData?: (rows: T[]) => Record<string, unknown>[];
  exportFileName?: string;

  // Styling
  className?: string;
  headerClassName?: string;
  rowClassName?: string | ((row: T) => string);
};

/**
 * Internal state for column preferences
 */
export type ColumnPreferences = {
  visibleColumns: string[];
  columnWidths: Record<string, number>;
  columnOrder?: string[];
};

/**
 * Ref methods exposed by DataTable
 */
export type DataTableRef<T> = {
  getRows: () => T[];
  getSelectedRows: () => T[];
  clearSelection: () => void;
  resetColumnPreferences: () => void;
  exportTable: (format: ExportFormat) => Promise<void>;
};

/**
 * Context value for DataTable
 */
export type DataTableContextValue<T> = {
  table: TanStackTable<T>;
  isLoading: boolean;
  error: Error | null;
  selectedRows: T[];
  setSelectedRows: (rows: T[]) => void;
};
