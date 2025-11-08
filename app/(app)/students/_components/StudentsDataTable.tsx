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

    const handleSort = (key: string) => {
      setSortConfig((prevConfig) => {
        if (prevConfig?.key === key) {
          return prevConfig.direction === 'asc'
            ? { key, direction: 'desc' }
            : null;
        }
        return { key, direction: 'asc' };
      });
    };

    const rows = useMemo(() => {
      const baseRows = (data ?? []) as RowType[];
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
    }, [data, sortConfig, colById]);

    useImperativeHandle(
      ref,
      () => ({
        getRows: () => rows ?? [],
      }),
      [rows]
    );

    if (isLoading) {
      return <p className="text-muted-foreground text-sm">Loading students…</p>;
    }
    if (isError) {
      return (
        <p className="text-destructive text-sm">Failed to load students.</p>
      );
    }

    const formatDate = (value: string | null) => {
      if (!value) return '';
      try {
        return format(new Date(value), 'dd MMM yyyy');
      } catch {
        return String(value);
      }
    };

    // Filter columns based on visibility preferences
    const visibleCols = allColumns.filter((col) =>
      visibleColumns.includes(col.id)
    );

    return (
      <div className="w-full overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="divide-x">
              {visibleCols.map((col) => (
                <SortableTableHead
                  key={col.id}
                  onSort={() => handleSort(col.id)}
                  sortDirection={
                    sortConfig?.key === col.id ? sortConfig.direction : null
                  }
                >
                  {col.label}
                </SortableTableHead>
              ))}
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y">
            {rows.map((s) => (
              <TableRow key={s.id} className="divide-x">
                {visibleCols.map((col) => {
                  // Make name column clickable
                  if (col.id === 'name') {
                    return (
                      <TableCell key={col.id}>
                        <Link
                          href={`/students/${s.id}`}
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
                <TableCell className="text-right">
                  <Link href={`/students/${s.id}`} className="text-primary">
                    View
                  </Link>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow className="divide-x">
                <TableCell colSpan={visibleCols.length + 1}>
                  <p className="text-muted-foreground text-sm">
                    No students found.
                  </p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    );
  }
);
