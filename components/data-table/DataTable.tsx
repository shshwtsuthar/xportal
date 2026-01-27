'use client';

import {
  useMemo,
  useState,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { GripVertical, ArrowUp, ArrowDown } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { CellContext, Column } from '@tanstack/react-table';
import type { DataTableProps, DataTableRef } from './types';
import { useDataTable } from './hooks/useDataTable';
import { useColumnPreferences } from './hooks/useColumnPreferences';
import { useRowSelection } from './hooks/useRowSelection';
import { useRowReordering } from './hooks/useRowReordering';
import { useExport } from './hooks/useExport';
import { DataTableHeader } from './DataTableHeader';
import { DataTablePagination } from './DataTablePagination';
import { getColumnWidth, getColumnMinWidth } from './utils';
import { debounce } from './utils';

function DataTableInner<T>(
  {
    data,
    columns,
    isLoading = false,
    error = null,
    enableSorting = true,
    enableFiltering = true,
    enableColumnResizing = true,
    enableColumnReordering = false,
    enableRowSelection = false,
    enableRowReordering = false,
    enableExport = false,
    enablePagination = true,
    enableGlobalSearch = true,
    defaultVisibleColumns = [],
    defaultPageSize = 10,
    pageSizeOptions = [10, 25, 50, 100],
    tableKey,
    rowSelectionMode = 'none',
    onRowClick,
    onRowSelect,
    onSortChange,
    onFilterChange,
    renderActions,
    renderToolbar,
    renderEmptyState,
    renderErrorState,
    exportFormats = ['csv', 'xlsx'],
    getExportData,
    exportFileName,
    className,
    headerClassName,
    rowClassName,
  }: DataTableProps<T>,
  ref: React.Ref<DataTableRef<T>>
) {
  const [searchQuery, setSearchQuery] = useState('');

  // Column preferences
  const {
    visibleColumns,
    columnWidths,
    toggleColumnVisibility,
    setColumnWidth,
    resetToDefaults,
  } = useColumnPreferences({
    tableKey,
    columns,
    defaultVisibleColumns:
      defaultVisibleColumns.length > 0
        ? defaultVisibleColumns
        : columns.map((c) => c.id),
  });

  // Debounced search
  const debouncedSearch = useMemo(
    () => debounce((value: string) => setSearchQuery(value), 300),
    []
  );

  // Data table hook
  const {
    table,
    sorting,
    setSorting,
    columnFilters,
    setColumnFilters,
    rowSelection: tableRowSelection,
    setRowSelection: setTableRowSelection,
    pagination,
  } = useDataTable({
    data,
    columns,
    enableSorting,
    enableFiltering,
    enablePagination,
    enableRowSelection,
    defaultPageSize,
    visibleColumns,
    onSortChange,
    onFilterChange,
    globalFilter: enableGlobalSearch ? searchQuery : undefined,
  });

  // Row selection
  const {
    selectedRows,
    clearSelection,
    isAllSelected,
    isSomeSelected,
    toggleAllRows,
  } = useRowSelection({
    rows: table.getRowModel().rows,
    mode: enableRowSelection ? rowSelectionMode : 'none',
    onRowSelect,
  });

  // Sync row selection state
  useMemo(() => {
    if (enableRowSelection) {
      setTableRowSelection(
        selectedRows.reduce(
          (acc, row) => {
            const rowId = table
              .getRowModel()
              .rows.find((r) => r.original === row)?.id;
            if (rowId) acc[rowId] = true;
            return acc;
          },
          {} as Record<string, boolean>
        )
      );
    }
  }, [selectedRows, enableRowSelection, setTableRowSelection, table]);

  // Row reordering
  const {
    isManualOrderActive,
    draggingId,
    dragOverId,
    handleDragStart,
    handleDragEnter,
    handleDragEnd,
    resetManualOrder,
    getOrderedRows,
  } = useRowReordering({
    rows: table.getRowModel().rows,
    onReorder: (reorderedRows) => {
      // Handle reordered rows if needed
    },
  });

  // Export
  const { exportTable } = useExport({
    rows: selectedRows.length > 0 ? selectedRows : data,
    visibleColumns,
    getExportData,
    exportFileName,
  });

  // Expose ref methods
  useImperativeHandle(
    ref,
    () => ({
      getRows: () => data,
      getSelectedRows: () => selectedRows,
      clearSelection,
      resetColumnPreferences: resetToDefaults,
      exportTable,
    }),
    [data, selectedRows, clearSelection, resetToDefaults, exportTable]
  );

  // Column resize handler
  const startResize = useCallback(
    (columnId: string, startX: number) => {
      if (!enableColumnResizing) return;

      const column = columns.find((c) => c.id === columnId);
      if (!column) return;

      const base = getColumnWidth(column, columnWidths);
      const minWidth = getColumnMinWidth(column);
      let latestWidth = base;

      const onMove = (e: MouseEvent) => {
        const delta = e.clientX - startX;
        const next = Math.max(minWidth, Math.min(600, base + delta));
        latestWidth = next;
        setColumnWidth(columnId, next);
      };

      const onUp = () => {
        setColumnWidth(columnId, latestWidth);
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp, { once: true });
    },
    [columns, columnWidths, enableColumnResizing, setColumnWidth]
  );

  // Get visible columns in order
  const visibleColumnsInOrder = useMemo(() => {
    return columns.filter((col) => visibleColumns.includes(col.id));
  }, [columns, visibleColumns]);

  // Loading state
  if (isLoading) {
    const skeletonRowCount = defaultPageSize;
    return (
      <div
        className={cn('w-full overflow-x-auto rounded-md border', className)}
      >
        <DataTableHeader
          searchQuery=""
          onSearchChange={undefined}
          className={headerClassName}
        />
        <Table>
          <TableHeader>
            <TableRow className="divide-x">
              {enableRowReordering && (
                <TableHead className="w-10 px-2 text-center" />
              )}
              {enableRowSelection && (
                <TableHead className="w-12 px-2">
                  <Skeleton className="h-4 w-4" />
                </TableHead>
              )}
              {visibleColumnsInOrder.map((col, index) => {
                const width = getColumnWidth(col, columnWidths);
                const minWidth = getColumnMinWidth(col);
                const isLastColumn = index === visibleColumnsInOrder.length - 1;
                return (
                  <TableHead
                    key={col.id}
                    style={{ width, ...(minWidth && { minWidth }) }}
                    className={cn(
                      'text-muted-foreground group relative h-12 px-0 text-left align-middle font-medium',
                      isLastColumn && 'border-r-0'
                    )}
                  >
                    <div className="flex w-full items-center gap-2 px-4">
                      <Skeleton className="h-4 w-24" />
                    </div>
                  </TableHead>
                );
              })}
              {renderActions && (
                <TableHead
                  style={{ width: 240 }}
                  className="bg-background before:bg-border sticky right-0 z-20 border-l-0 px-4 text-right before:absolute before:top-0 before:bottom-0 before:left-0 before:w-px before:content-['']"
                >
                  <Skeleton className="ml-auto h-4 w-16" />
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y">
            {Array.from({ length: skeletonRowCount }).map((_, index) => (
              <TableRow key={index} className="divide-x">
                {enableRowReordering && (
                  <TableCell className="w-8 px-2">
                    <Skeleton className="h-4 w-4" />
                  </TableCell>
                )}
                {enableRowSelection && (
                  <TableCell className="w-12 px-2">
                    <Skeleton className="h-4 w-4" />
                  </TableCell>
                )}
                {visibleColumnsInOrder.map((col, colIndex) => {
                  const width = getColumnWidth(col, columnWidths);
                  const minWidth = getColumnMinWidth(col);
                  const isLastColumn =
                    colIndex === visibleColumnsInOrder.length - 1;
                  return (
                    <TableCell
                      key={`skeleton-${index}-${col.id}`}
                      style={{ width, ...(minWidth && { minWidth }) }}
                      className={cn('px-4', isLastColumn && 'border-r-0')}
                    >
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  );
                })}
                {renderActions && (
                  <TableCell
                    style={{ width: 240 }}
                    className="bg-background before:bg-border sticky right-0 z-10 border-l-0 px-4 text-right before:absolute before:top-0 before:bottom-0 before:left-0 before:w-px before:content-['']"
                  >
                    <Skeleton className="ml-auto h-8 w-24" />
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  // Error state
  if (error) {
    if (renderErrorState) {
      return <>{renderErrorState(error)}</>;
    }
    return (
      <div className={cn('w-full rounded-md border p-4', className)}>
        <p className="text-destructive text-sm">
          Failed to load data: {error.message}
        </p>
      </div>
    );
  }

  const rows = isManualOrderActive
    ? getOrderedRows()
    : table.getRowModel().rows;

  // Empty state
  if (rows.length === 0) {
    if (renderEmptyState) {
      return <>{renderEmptyState()}</>;
    }
    return (
      <div className={cn('w-full rounded-md border p-4', className)}>
        <p className="text-muted-foreground text-sm">
          {searchQuery.trim()
            ? 'No rows match your search.'
            : 'No data available.'}
        </p>
      </div>
    );
  }

  return (
    <div className={cn('w-full overflow-x-auto rounded-md border', className)}>
      {/* Manual order banner */}
      {isManualOrderActive && (
        <div className="bg-muted/40 flex items-center justify-between border-b px-3 py-2 text-xs">
          <span className="text-muted-foreground">
            Manual row order active. Column sorting is disabled.
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={resetManualOrder}
            aria-label="Reset manual order"
          >
            Reset order
          </Button>
        </div>
      )}

      {/* Search header */}
      {enableGlobalSearch && (
        <DataTableHeader
          searchQuery={searchQuery}
          onSearchChange={debouncedSearch}
          className={headerClassName}
        />
      )}

      {/* Toolbar */}
      {renderToolbar && (
        <div className="border-b px-3 py-2">{renderToolbar()}</div>
      )}

      {/* Table */}
      <Table>
        <TableHeader>
          <TableRow className="divide-x">
            {/* Row reorder handle */}
            {enableRowReordering && (
              <TableHead
                className="w-10 px-2 text-center"
                aria-label="Manual order column"
              />
            )}

            {/* Row selection checkbox */}
            {enableRowSelection && rowSelectionMode === 'multi' && (
              <TableHead className="w-12 px-2">
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      toggleAllRows();
                    } else {
                      clearSelection();
                    }
                  }}
                  aria-label="Select all rows"
                />
              </TableHead>
            )}

            {/* Column headers */}
            {visibleColumnsInOrder.map((column, index) => {
              const width = getColumnWidth(column, columnWidths);
              const minWidth = getColumnMinWidth(column);
              const isLastColumn = index === visibleColumnsInOrder.length - 1;
              const sortDirection = sorting.find((s) => s.id === column.id)
                ?.desc
                ? 'desc'
                : sorting.find((s) => s.id === column.id)
                  ? 'asc'
                  : null;

              return (
                <TableHead
                  key={column.id}
                  style={{ width, ...(minWidth && { minWidth }) }}
                  className={cn(
                    'text-muted-foreground group relative h-12 px-0 text-left align-middle font-medium',
                    isLastColumn && 'border-r-0'
                  )}
                >
                  <button
                    type="button"
                    className={cn(
                      'flex w-full items-center gap-2 px-4',
                      column.enableSorting !== false &&
                        enableSorting &&
                        !isManualOrderActive
                        ? 'hover:text-foreground cursor-pointer'
                        : 'cursor-default',
                      isManualOrderActive && 'cursor-not-allowed opacity-50'
                    )}
                    onClick={() => {
                      if (
                        !column.enableSorting ||
                        !enableSorting ||
                        isManualOrderActive
                      )
                        return;

                      setSorting((prev) => {
                        const existing = prev.find((s) => s.id === column.id);
                        if (existing) {
                          if (existing.desc) {
                            // Remove sort
                            return prev.filter((s) => s.id !== column.id);
                          } else {
                            // Toggle to desc
                            return prev.map((s) =>
                              s.id === column.id ? { ...s, desc: true } : s
                            );
                          }
                        } else {
                          // Add asc sort
                          return [{ id: column.id, desc: false }];
                        }
                      });
                    }}
                    aria-label={`Sort by ${typeof column.header === 'string' ? column.header : column.id}`}
                    aria-sort={
                      sortDirection === 'asc'
                        ? 'ascending'
                        : sortDirection === 'desc'
                          ? 'descending'
                          : 'none'
                    }
                    disabled={
                      !column.enableSorting ||
                      !enableSorting ||
                      isManualOrderActive
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        if (
                          column.enableSorting &&
                          enableSorting &&
                          !isManualOrderActive
                        ) {
                          setSorting((prev) => {
                            const existing = prev.find(
                              (s) => s.id === column.id
                            );
                            if (existing) {
                              if (existing.desc) {
                                return prev.filter((s) => s.id !== column.id);
                              } else {
                                return prev.map((s) =>
                                  s.id === column.id ? { ...s, desc: true } : s
                                );
                              }
                            } else {
                              return [{ id: column.id, desc: false }];
                            }
                          });
                        }
                      }
                    }}
                  >
                    <span className="truncate">
                      {typeof column.header === 'string'
                        ? column.header
                        : column.id}
                    </span>
                    {column.enableSorting !== false &&
                      enableSorting &&
                      !isManualOrderActive && (
                        <span className="text-muted-foreground ml-1 text-[10px]">
                          {sortDirection === 'asc' ? (
                            <ArrowUp className="h-3 w-3" />
                          ) : sortDirection === 'desc' ? (
                            <ArrowDown className="h-3 w-3" />
                          ) : null}
                        </span>
                      )}
                  </button>

                  {/* Column resize handle */}
                  {enableColumnResizing && (
                    <div
                      role="separator"
                      aria-orientation="vertical"
                      aria-label={`Resize ${typeof column.header === 'string' ? column.header : column.id}`}
                      tabIndex={0}
                      className="hover:bg-border focus-visible:ring-ring absolute top-0 right-0 h-full w-1 cursor-col-resize focus-visible:ring-1 focus-visible:ring-offset-1 focus-visible:outline-hidden"
                      onMouseDown={(e) => startResize(column.id, e.clientX)}
                      onKeyDown={(e) => {
                        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                          e.preventDefault();
                          const delta = e.key === 'ArrowLeft' ? -8 : 8;
                          const currentWidth = getColumnWidth(
                            column,
                            columnWidths
                          );
                          const minWidth = getColumnMinWidth(column);
                          const next = Math.max(
                            minWidth,
                            Math.min(600, currentWidth + delta)
                          );
                          setColumnWidth(column.id, next);
                        }
                      }}
                    />
                  )}
                </TableHead>
              );
            })}

            {/* Actions column */}
            {renderActions && (
              <TableHead
                style={{ width: 240 }}
                className="bg-background before:bg-border sticky right-0 z-20 border-l-0 px-4 text-right before:absolute before:top-0 before:bottom-0 before:left-0 before:w-px before:content-['']"
              >
                Actions
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y">
          {rows.map((row) => {
            const isSelected = tableRowSelection[row.id] || false;
            const isDragging = draggingId === row.id;
            const isDragOver = dragOverId === row.id;

            return (
              <TableRow
                key={row.id}
                className={cn(
                  'divide-x',
                  isSelected && 'bg-muted/50',
                  isDragging && 'opacity-50',
                  isDragOver && 'bg-muted',
                  typeof rowClassName === 'function'
                    ? rowClassName(row.original)
                    : rowClassName,
                  onRowClick && 'cursor-pointer'
                )}
                draggable={enableRowReordering}
                onDragStart={() => handleDragStart(row.id)}
                onDragEnter={() => handleDragEnter(row.id)}
                onDragEnd={handleDragEnd}
                onClick={() => onRowClick?.(row)}
                onKeyDown={(e) => {
                  if ((e.key === 'Enter' || e.key === ' ') && onRowClick) {
                    e.preventDefault();
                    onRowClick(row);
                  }
                }}
                tabIndex={onRowClick ? 0 : undefined}
                role={onRowClick ? 'button' : undefined}
                aria-label={onRowClick ? `Row ${row.id}` : undefined}
              >
                {/* Row reorder handle */}
                {enableRowReordering && (
                  <TableCell className="text-muted-foreground w-8 px-2">
                    <GripVertical className="h-4 w-4" />
                  </TableCell>
                )}

                {/* Row selection checkbox */}
                {enableRowSelection && rowSelectionMode === 'multi' && (
                  <TableCell className="w-12 px-2">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) => {
                        setTableRowSelection((prev) => ({
                          ...prev,
                          [row.id]: checked === true,
                        }));
                      }}
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`Select row ${row.id}`}
                    />
                  </TableCell>
                )}

                {/* Data cells */}
                {visibleColumnsInOrder.map((column, index) => {
                  const width = getColumnWidth(column, columnWidths);
                  const minWidth = getColumnMinWidth(column);
                  const isLastColumn =
                    index === visibleColumnsInOrder.length - 1;
                  const cell = row
                    .getVisibleCells()
                    .find((c) => c.column.id === column.id);

                  return (
                    <TableCell
                      key={`${row.id}-${column.id}`}
                      style={{ width, ...(minWidth && { minWidth }) }}
                      className={cn(
                        column.noTruncate ? 'px-4' : 'truncate px-4',
                        isLastColumn && 'border-r-0'
                      )}
                    >
                      {typeof column.cell === 'function' ? (
                        <>
                          {column.cell({
                            getValue: () => {
                              if (
                                'accessorKey' in column &&
                                column.accessorKey
                              ) {
                                return (
                                  row.original as Record<string, unknown>
                                )[column.accessorKey as string];
                              }
                              if ('accessorFn' in column && column.accessorFn) {
                                return typeof column.accessorFn === 'function'
                                  ? column.accessorFn(row.original, row.index)
                                  : row.original;
                              }
                              return row.original;
                            },
                            row,
                            column: column as Column<T, unknown>,
                            table: table,
                            renderValue: () => {
                              if (
                                'accessorKey' in column &&
                                column.accessorKey
                              ) {
                                return (
                                  row.original as Record<string, unknown>
                                )[column.accessorKey as string];
                              }
                              if ('accessorFn' in column && column.accessorFn) {
                                return typeof column.accessorFn === 'function'
                                  ? column.accessorFn(row.original, row.index)
                                  : row.original;
                              }
                              return row.original;
                            },
                          } as CellContext<T, unknown>)}
                        </>
                      ) : cell ? (
                        <>{cell.renderValue()}</>
                      ) : (
                        String(
                          (row.original as Record<string, unknown>)[
                            column.id
                          ] ?? ''
                        )
                      )}
                    </TableCell>
                  );
                })}

                {/* Actions cell */}
                {renderActions && (
                  <TableCell
                    style={{ width: 240 }}
                    className="bg-background before:bg-border sticky right-0 z-10 border-l-0 px-4 text-right before:absolute before:top-0 before:bottom-0 before:left-0 before:w-px before:content-['']"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {renderActions(row.original)}
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* Pagination */}
      {enablePagination && rows.length > 0 && (
        <DataTablePagination table={table} pageSizeOptions={pageSizeOptions} />
      )}
    </div>
  );
}

export const DataTable = forwardRef(DataTableInner) as <T>(
  props: DataTableProps<T> & { ref?: React.Ref<DataTableRef<T>> }
) => React.ReactElement;
