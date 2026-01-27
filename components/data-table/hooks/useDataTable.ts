import { useMemo, useState, useCallback } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  type SortingState,
  type ColumnFiltersState,
  type VisibilityState,
  type ColumnOrderState,
  type PaginationState,
  type RowSelectionState,
  type Row,
  type CellContext,
  type Table,
} from '@tanstack/react-table';
import type { DataTableColumnDef } from '../types';
import { extractTextFromNode } from '../utils';

type UseDataTableOptions<T> = {
  data: T[];
  columns: DataTableColumnDef<T>[];
  enableSorting?: boolean;
  enableFiltering?: boolean;
  enablePagination?: boolean;
  enableRowSelection?: boolean;
  defaultPageSize?: number;
  visibleColumns: string[];
  onSortChange?: (sorting: SortingState) => void;
  onFilterChange?: (filters: ColumnFiltersState) => void;
  globalFilter?: string;
};

export const useDataTable = <T>({
  data,
  columns,
  enableSorting = true,
  enableFiltering = true,
  enablePagination = true,
  enableRowSelection = false,
  defaultPageSize = 10,
  visibleColumns,
  onSortChange,
  onFilterChange,
  globalFilter,
}: UseDataTableOptions<T>) => {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: defaultPageSize,
  });

  // Update column visibility based on visibleColumns prop
  useMemo(() => {
    const visibility: VisibilityState = {};
    columns.forEach((col) => {
      visibility[col.id] = visibleColumns.includes(col.id);
    });
    setColumnVisibility(visibility);
  }, [columns, visibleColumns]);

  // Handle sorting changes
  const handleSortingChange = useCallback(
    (updater: SortingState | ((prev: SortingState) => SortingState)) => {
      const newSorting =
        typeof updater === 'function' ? updater(sorting) : updater;
      setSorting(newSorting);
      onSortChange?.(newSorting);
    },
    [sorting, onSortChange]
  );

  // Handle filter changes
  const handleFilterChange = useCallback(
    (
      updater:
        | ColumnFiltersState
        | ((prev: ColumnFiltersState) => ColumnFiltersState)
    ) => {
      const newFilters =
        typeof updater === 'function' ? updater(columnFilters) : updater;
      setColumnFilters(newFilters);
      onFilterChange?.(newFilters);
    },
    [columnFilters, onFilterChange]
  );

  // Global filter function for searching across all columns
  const globalFilterFn = useCallback(
    (row: Row<T>, columnId: string, filterValue: string) => {
      if (!filterValue) return true;

      const searchValue = filterValue.toLowerCase();
      const visibleCols = columns.filter((col) =>
        visibleColumns.includes(col.id)
      );

      return visibleCols.some((col) => {
        const cellValue = row.original;
        let value: string = '';

        // Try to get value from column accessor
        if ('accessorKey' in col && col.accessorKey) {
          const rawValue = (cellValue as Record<string, unknown>)[
            col.accessorKey as string
          ];
          value = String(rawValue ?? '').toLowerCase();
        } else if (
          'accessorFn' in col &&
          col.accessorFn &&
          typeof col.accessorFn === 'function'
        ) {
          const rawValue = col.accessorFn(cellValue, 0);
          value = String(rawValue ?? '').toLowerCase();
        } else if (typeof col.cell === 'function') {
          // For custom cells, try to extract text from rendered content
          const cellContext = {
            getValue: () => cellValue,
            row: row as Row<T>,
            column: {
              id: col.id,
              columnDef: col,
            },
            table: {} as Table<T>,
            renderValue: () => cellValue,
          } as CellContext<T, unknown>;
          const rendered = col.cell(cellContext);
          value = extractTextFromNode(rendered).toLowerCase();
        }

        return value.includes(searchValue);
      });
    },
    [columns, visibleColumns]
  );

  // Memoize columns with proper configuration
  const memoizedColumns = useMemo(() => {
    return columns.map((col) => ({
      ...col,
      enableSorting:
        enableSorting &&
        ('enableSorting' in col ? col.enableSorting !== false : true),
      ...('enableFiltering' in col && {
        enableFiltering: enableFiltering && col.enableFiltering !== false,
      }),
    }));
  }, [columns, enableSorting, enableFiltering]);

  // Initialize table
  const table = useReactTable({
    data,
    columns: memoizedColumns,
    state: {
      sorting: enableSorting ? sorting : undefined,
      columnFilters: enableFiltering ? columnFilters : undefined,
      columnVisibility,
      columnOrder: columnOrder.length > 0 ? columnOrder : undefined,
      rowSelection: enableRowSelection ? rowSelection : undefined,
      pagination: enablePagination ? pagination : undefined,
      globalFilter,
    },
    onSortingChange: enableSorting ? handleSortingChange : undefined,
    onColumnFiltersChange: enableFiltering ? handleFilterChange : undefined,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange: setColumnOrder,
    onRowSelectionChange: enableRowSelection ? setRowSelection : undefined,
    onPaginationChange: enablePagination ? setPagination : undefined,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: enableSorting ? getSortedRowModel() : undefined,
    getFilteredRowModel: enableFiltering ? getFilteredRowModel() : undefined,
    getPaginationRowModel: enablePagination
      ? getPaginationRowModel()
      : undefined,
    globalFilterFn: globalFilter ? globalFilterFn : undefined,
    enableRowSelection,
    manualSorting: false,
    manualFiltering: false,
    manualPagination: false,
  });

  return {
    table,
    sorting,
    setSorting: handleSortingChange,
    columnFilters,
    setColumnFilters: handleFilterChange,
    columnVisibility,
    setColumnVisibility,
    columnOrder,
    setColumnOrder,
    rowSelection,
    setRowSelection,
    pagination,
    setPagination,
  };
};
