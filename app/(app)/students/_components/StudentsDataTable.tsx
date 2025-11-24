'use client';

import Link from 'next/link';
import {
  useMemo,
  useState,
  useEffect,
  useCallback,
  useRef,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { useGetStudents } from '@/src/hooks/useGetStudents';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { SortableTableHead } from '@/components/ui/sortable-table-head';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, GripVertical } from 'lucide-react';
import { format } from 'date-fns';
import type { Tables } from '@/database.types';
import type { StudentFilters } from '@/src/hooks/useStudentsFilters';
import {
  getStudentsTableKey,
  useGetTablePreferences,
  useUpsertTablePreferences,
  type TablePreferences,
} from '@/src/hooks/useTablePreferences';
import {
  DEFAULT_VISIBLE_COLUMNS,
  getStudentsColumns,
  type ColumnDef,
  type RowType,
} from './studentsTableColumns';
import { Button } from '@/components/ui/button';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type Props = {
  filters?: StudentFilters;
};

export type StudentsDataTableRef = {
  getRows: () => RowType[];
};

export const StudentsDataTable = forwardRef<StudentsDataTableRef, Props>(
  function StudentsDataTable({ filters }: Props, ref) {
    const { data, isLoading, isError } = useGetStudents(filters);
    const [sortConfig, setSortConfig] = useState<{
      key: string;
      direction: 'asc' | 'desc';
    } | null>(null);
    const [manualOrderIds, setManualOrderIds] = useState<string[] | null>(null);
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [dragOverId, setDragOverId] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [searchQuery, setSearchQuery] = useState<string>('');

    // Preferences: visible columns persisted per user
    const tableKey = getStudentsTableKey();
    const { data: prefs } = useGetTablePreferences(tableKey);
    const upsertPrefs = useUpsertTablePreferences();
    const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
    const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
      if (!prefs) return;
      const defaults = DEFAULT_VISIBLE_COLUMNS;
      const hasPrefs = prefs.visible_columns.length > 0;
      const nextVisible = hasPrefs ? prefs.visible_columns : defaults;
      setVisibleColumns(nextVisible);

      // Persist defaults once if there are no stored preferences
      if (!hasPrefs) {
        persistPrefs({ visible_columns: defaults });
      }
    }, [prefs]);

    const persistPrefs = useCallback(
      (next: Partial<TablePreferences>) => {
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => {
          upsertPrefs.mutate({
            tableKey,
            visible_columns: next.visible_columns ?? visibleColumns,
          });
        }, 300);
      },
      [tableKey, visibleColumns, upsertPrefs]
    );

    const allColumns: ColumnDef[] = getStudentsColumns();

    const colById = useMemo(
      () => new Map(allColumns.map((c) => [c.id, c] as const)),
      [allColumns]
    );

    const isManualOrderActive = !!(manualOrderIds && manualOrderIds.length > 0);

    const handleSort = (key: string) => {
      if (isManualOrderActive) return; // sorting disabled during manual order
      setSortConfig((prevConfig) => {
        if (prevConfig?.key === key) {
          return prevConfig.direction === 'asc'
            ? { key, direction: 'desc' }
            : null;
        }
        return { key, direction: 'asc' };
      });
    };

    const onDragStart = (id: string) => setDraggingId(id);
    const onDragEnter = (id: string) => setDragOverId(id);
    const onDragEnd = () => {
      if (!draggingId || !dragOverId) {
        setDraggingId(null);
        setDragOverId(null);
        return;
      }
      const ids = (manualOrderIds ?? rows.map((r) => r.id)).slice();
      const from = ids.indexOf(draggingId);
      const to = ids.indexOf(dragOverId);
      if (from >= 0 && to >= 0 && from !== to) {
        ids.splice(to, 0, ids.splice(from, 1)[0]);
        setManualOrderIds(ids);
      }
      setDraggingId(null);
      setDragOverId(null);
    };

    const rows = useMemo(() => {
      const baseRows = (data ?? []) as RowType[];
      if (manualOrderIds && manualOrderIds.length > 0) {
        const orderIndex = new Map<string, number>();
        manualOrderIds.forEach((id, idx) => orderIndex.set(id, idx));
        return [...baseRows].sort((a, b) => {
          const ai = orderIndex.get(a.id) ?? Number.MAX_SAFE_INTEGER;
          const bi = orderIndex.get(b.id) ?? Number.MAX_SAFE_INTEGER;
          return ai - bi;
        });
      }
      if (!sortConfig) return baseRows;

      const col = colById.get(sortConfig.key);
      if (!col || !col.sortable || !col.sortAccessor) return baseRows;
      return [...baseRows].sort((a, b) => {
        const aVal = col.sortAccessor!(a);
        const bVal = col.sortAccessor!(b);
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }, [data, sortConfig, manualOrderIds, colById]);

    // Filter columns based on visibility preferences
    const visibleCols = useMemo(
      () => allColumns.filter((col) => visibleColumns.includes(col.id)),
      [allColumns, visibleColumns]
    );

    // Apply client-side search filtering
    const filteredRows = useMemo(() => {
      if (!searchQuery?.trim()) return rows;

      const query = searchQuery.toLowerCase().trim();
      return rows.filter((row) => {
        return visibleCols.some((col) => {
          // Get searchable value from column
          let value: string = '';

          // For date columns, prefer rendered text (formatted date) over sortAccessor (timestamp)
          const isDateColumn =
            col.id === 'date_of_birth' || col.id === 'created_at';

          if (isDateColumn) {
            // For dates, use the rendered formatted text
            const rendered = col.render(row);
            if (typeof rendered === 'string') {
              value = rendered.toLowerCase();
            } else {
              value = String(rendered ?? '').toLowerCase();
            }
          } else if (col.sortAccessor) {
            // Use sortAccessor for raw data values (name, email, student_id, status)
            const rawValue = col.sortAccessor(row);
            value = String(rawValue ?? '').toLowerCase();
          } else {
            // Fall back to rendered text for columns without sortAccessor
            const rendered = col.render(row);
            if (typeof rendered === 'string') {
              value = rendered.toLowerCase();
            } else if (
              rendered &&
              typeof rendered === 'object' &&
              'props' in rendered
            ) {
              // For React elements like Badge, extract children text
              const element = rendered as React.ReactElement<{
                children?: React.ReactNode;
              }>;
              const children = element.props?.children;
              value = String(children ?? '').toLowerCase();
            } else {
              value = String(rendered ?? '').toLowerCase();
            }
          }

          return value.includes(query);
        });
      });
    }, [rows, searchQuery, visibleCols]);

    // Pagination logic
    const totalPages = Math.ceil(filteredRows.length / rowsPerPage);
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const paginatedRows = filteredRows.slice(startIndex, endIndex);

    // Reset to page 1 when data or search changes
    useEffect(() => {
      setCurrentPage(1);
    }, [data, searchQuery]);

    useImperativeHandle(
      ref,
      () => ({
        getRows: () => (filteredRows as RowType[]) ?? [],
      }),
      [filteredRows]
    );

    if (isLoading) {
      // Show skeleton table structure while loading
      const skeletonRowCount = rowsPerPage || 10;
      const defaultVisibleColumns =
        visibleColumns.length > 0 ? visibleColumns : DEFAULT_VISIBLE_COLUMNS;

      return (
        <div className="w-full overflow-hidden rounded-md border">
          <div className="border-b p-3">
            <div className="relative">
              <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
              <Skeleton className="h-9 w-full pl-9" />
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="divide-x">
                <TableHead className="w-10 px-2 text-center" />
                {defaultVisibleColumns.map((id) => {
                  const c = colById.get(id)!;
                  return (
                    <TableHead key={id} className="px-4">
                      <Skeleton className="h-4 w-24" />
                    </TableHead>
                  );
                })}
                <TableHead className="px-4 text-right">
                  <Skeleton className="ml-auto h-4 w-16" />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y">
              {Array.from({ length: skeletonRowCount }).map((_, index) => (
                <TableRow key={index} className="divide-x">
                  <TableCell className="w-8 px-2">
                    <Skeleton className="h-4 w-4" />
                  </TableCell>
                  {defaultVisibleColumns.map((id) => (
                    <TableCell key={`skeleton-${index}-${id}`} className="px-4">
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                  <TableCell className="px-4 text-right">
                    <Skeleton className="ml-auto h-8 w-24" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      );
    }
    if (isError) {
      return (
        <p className="text-destructive text-sm">Failed to load students.</p>
      );
    }

    return (
      <div className="w-full overflow-hidden rounded-md border">
        {isManualOrderActive && (
          <div className="bg-muted/40 flex items-center justify-between border-b px-3 py-2 text-xs">
            <span className="text-muted-foreground">
              Manual row order active. Column sorting is disabled.
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setManualOrderIds(null)}
              aria-label="Reset manual order"
            >
              Reset order
            </Button>
          </div>
        )}
        <div className="border-b p-3">
          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Search all columns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-sm"
              aria-label="Search students table"
            />
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="divide-x">
              <TableHead
                className="w-10 px-2 text-center"
                aria-label="Manual order column"
              />
              {visibleCols.map((col) => (
                <SortableTableHead
                  key={col.id}
                  onSort={() => handleSort(col.id)}
                  sortDirection={
                    isManualOrderActive
                      ? null
                      : sortConfig?.key === col.id
                        ? sortConfig.direction
                        : null
                  }
                  disabled={isManualOrderActive}
                >
                  {col.label}
                </SortableTableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y">
            {paginatedRows.map((s) => (
              <TableRow
                key={s.id}
                className="divide-x"
                draggable
                onDragStart={() => onDragStart(s.id)}
                onDragEnter={() => onDragEnter(s.id)}
                onDragEnd={onDragEnd}
              >
                <TableCell className="text-muted-foreground w-8">
                  <GripVertical className="h-4 w-4" />
                </TableCell>
                {visibleCols.map((col) => {
                  // Make name column clickable
                  if (col.id === 'name') {
                    return (
                      <TableCell key={col.id}>
                        <Link
                          href={`/students/${s.student_id_display}`}
                          className="hover:underline"
                          aria-label={`View ${[s.first_name, s.last_name]
                            .filter(Boolean)
                            .join(' ')}`}
                        >
                          {col.render(s)}
                        </Link>
                      </TableCell>
                    );
                  }
                  return <TableCell key={col.id}>{col.render(s)}</TableCell>;
                })}
                {/* Name already links to student record, so no trailing actions cell */}
              </TableRow>
            ))}
            {paginatedRows.length === 0 && (
              <TableRow className="divide-x">
                <TableCell colSpan={visibleCols.length + 1}>
                  <p className="text-muted-foreground text-sm">
                    {searchQuery.trim()
                      ? 'No students match your search.'
                      : 'No students found.'}
                  </p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        {filteredRows.length > 0 && (
          <div className="flex flex-col gap-4 border-t px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm whitespace-nowrap">
                Rows per page:
              </span>
              <Select
                value={rowsPerPage.toString()}
                onValueChange={(value) => {
                  setRowsPerPage(Number(value));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-[70px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-center sm:justify-end">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className={
                        currentPage === 1
                          ? 'pointer-events-none opacity-50'
                          : 'cursor-pointer'
                      }
                    />
                  </PaginationItem>
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 7) {
                      pageNum = i + 1;
                    } else if (currentPage <= 4) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 3) {
                      pageNum = totalPages - 6 + i;
                    } else {
                      pageNum = currentPage - 3 + i;
                    }
                    return (
                      <PaginationItem key={pageNum}>
                        <PaginationLink
                          onClick={() => setCurrentPage(pageNum)}
                          isActive={currentPage === pageNum}
                          className="cursor-pointer"
                        >
                          {pageNum}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      className={
                        currentPage === totalPages
                          ? 'pointer-events-none opacity-50'
                          : 'cursor-pointer'
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </div>
        )}
      </div>
    );
  }
);
