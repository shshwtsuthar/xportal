'use client';

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { RecordPaymentDialog } from './RecordPaymentDialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { GripVertical } from 'lucide-react';
// removed unused Tables type
import { useGetInvoices } from '@/src/hooks/useGetInvoices';
import {
  getInvoicesTableKey,
  useGetTablePreferences,
  useUpsertTablePreferences,
} from '@/src/hooks/useTablePreferences';
import {
  DEFAULT_VISIBLE_COLUMNS,
  getInvoicesColumns,
  type ColumnDef,
  type RowType,
} from './invoicesTableColumns';

export type InvoicesDataTableRef = { getRows: () => RowType[] };

type Props = { filters?: unknown };

export const InvoicesDataTable = forwardRef<InvoicesDataTableRef, Props>(
  function InvoicesDataTable({ filters }: Props, ref) {
    const { data, isLoading, isError } = useGetInvoices(
      filters as Record<string, unknown> | undefined
    );

    const [sortConfig, setSortConfig] = useState<{
      key: string;
      direction: 'asc' | 'desc';
    } | null>(null);
    const [manualOrderIds, setManualOrderIds] = useState<string[] | null>(null);
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [dragOverId, setDragOverId] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [selectedInvoiceId, setSelectedInvoiceId] = useState<
      string | undefined
    >();

    const tableKey = getInvoicesTableKey();
    const { data: prefs } = useGetTablePreferences(tableKey);
    const upsertPrefs = useUpsertTablePreferences();
    const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
    const [columnWidths, setColumnWidths] = useState<Record<string, number>>(
      {}
    );
    const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const persistPrefs = useCallback(
      (
        next: Partial<{
          visible_columns: string[];
          column_widths: Record<string, number>;
        }>
      ) => {
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => {
          upsertPrefs.mutate({
            tableKey,
            visible_columns: next.visible_columns ?? visibleColumns,
            column_widths: next.column_widths ?? columnWidths,
          });
        }, 300);
      },
      [tableKey, visibleColumns, columnWidths, upsertPrefs]
    );

    useEffect(() => {
      if (!prefs) return;
      const defaults = DEFAULT_VISIBLE_COLUMNS;
      const hasPrefs = prefs.visible_columns.length > 0;
      const nextVisible = hasPrefs ? prefs.visible_columns : defaults;
      setVisibleColumns(nextVisible);
      setColumnWidths(prefs.column_widths || {});
      if (!hasPrefs) persistPrefs({ visible_columns: defaults });
    }, [prefs, persistPrefs]);

    const allColumns: ColumnDef[] = getInvoicesColumns();
    const colById = useMemo(
      () => new Map(allColumns.map((c) => [c.id, c] as const)),
      [allColumns]
    );

    const onToggleColumn = (id: string) => {
      setVisibleColumns((prev) => {
        const next = prev.includes(id)
          ? prev.filter((x) => x !== id)
          : [...prev, id];
        persistPrefs({ visible_columns: next });
        return next;
      });
    };

    const startResize = (id: string, startX: number) => {
      const col = colById.get(id);
      const base = columnWidths[id] ?? col?.width ?? 160;
      let latestWidth = base;
      const onMove = (e: MouseEvent) => {
        const delta = e.clientX - startX;
        const next = Math.max(100, Math.min(600, base + delta));
        latestWidth = next;
        setColumnWidths((prev) => ({ ...prev, [id]: next }));
      };
      const onUp = () => {
        const updated = { ...columnWidths, [id]: latestWidth };
        persistPrefs({ column_widths: updated });
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp, { once: true });
    };

    const rows = useMemo(() => {
      const base = (data ?? []) as RowType[];
      const working = [...base];
      if (sortConfig) {
        const { key, direction } = sortConfig;
        const col = colById.get(key);
        if (col) {
          const accessor =
            col.sortAccessor ??
            ((r: RowType) =>
              (r as unknown as Record<string, unknown>)[key] as
                | string
                | number);
          working.sort((a, b) => {
            const av = accessor(a) ?? '';
            const bv = accessor(b) ?? '';
            if (av < bv) return direction === 'asc' ? -1 : 1;
            if (av > bv) return direction === 'asc' ? 1 : -1;
            return 0;
          });
        }
      }
      if (manualOrderIds) {
        const indexById = new Map(
          manualOrderIds.map((id, i) => [id, i] as const)
        );
        working.sort(
          (a, b) =>
            indexById.get(a.id as string)! - indexById.get(b.id as string)!
        );
      }
      return working;
    }, [data, sortConfig, manualOrderIds, colById]);

    useImperativeHandle(ref, () => ({ getRows: () => rows }));

    const totalPages = Math.max(1, Math.ceil(rows.length / rowsPerPage));
    const pagedRows = useMemo(() => {
      const start = (currentPage - 1) * rowsPerPage;
      return rows.slice(start, start + rowsPerPage);
    }, [rows, currentPage, rowsPerPage]);

    const onDragStart = (id: string) => setDraggingId(id);
    const onDragEnter = (id: string) => setDragOverId(id);
    const onDragEnd = () => {
      if (!draggingId || !dragOverId) {
        setDraggingId(null);
        setDragOverId(null);
        return;
      }
      const ids = (manualOrderIds ?? rows.map((r) => r.id as string)).slice();
      const from = ids.indexOf(draggingId);
      const to = ids.indexOf(dragOverId);
      if (from >= 0 && to >= 0 && from !== to) {
        ids.splice(to, 0, ids.splice(from, 1)[0]);
        setManualOrderIds(ids);
      }
      setDraggingId(null);
      setDragOverId(null);
    };

    const visibleDefs = allColumns.filter((c) => visibleColumns.includes(c.id));

    const handleSortClick = (key: string) => {
      setSortConfig((prev) => {
        if (prev?.key === key) {
          return prev.direction === 'asc' ? { key, direction: 'desc' } : null;
        }
        return { key, direction: 'asc' };
      });
    };

    if (isLoading)
      return <p className="text-muted-foreground text-sm">Loading invoices…</p>;
    if (isError)
      return (
        <p className="text-destructive text-sm">Failed to load invoices.</p>
      );

    return (
      <div className="w-full overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="divide-x">
              <TableHead className="w-8"></TableHead>
              {visibleDefs.map((col) => (
                <TableHead
                  key={col.id}
                  style={{
                    width: (columnWidths[col.id] ?? col.width ?? 160) + 'px',
                  }}
                >
                  <div className="flex items-center">
                    <button
                      type="button"
                      className="text-left"
                      onClick={() => col.sortable && handleSortClick(col.id)}
                      aria-label={`Sort by ${col.label}`}
                    >
                      {col.label}
                    </button>
                    <div
                      role="separator"
                      tabIndex={0}
                      className="ml-2 h-4 w-1 cursor-col-resize select-none"
                      onMouseDown={(e) => startResize(col.id, e.clientX)}
                      aria-label={`Resize column ${col.label}`}
                    />
                  </div>
                </TableHead>
              ))}
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y">
            {pagedRows.map((row) => (
              <TableRow
                key={row.id}
                className="divide-x"
                draggable
                onDragStart={() => onDragStart(row.id as string)}
                onDragEnter={() => onDragEnter(row.id as string)}
                onDragEnd={onDragEnd}
              >
                <TableCell className="text-muted-foreground w-8">
                  <GripVertical className="h-4 w-4" />
                </TableCell>
                {visibleDefs.map((col) => (
                  <TableCell key={col.id}>{col.render(row)}</TableCell>
                ))}
                <TableCell className="text-right">
                  {row.status !== 'PAID' && row.status !== 'VOID' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedInvoiceId(row.id as string)}
                    >
                      Record Payment
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {pagedRows.length === 0 && (
              <TableRow className="divide-x">
                <TableCell
                  colSpan={visibleDefs.length + 2}
                  className="text-muted-foreground py-8 text-center text-sm"
                >
                  No invoices to display.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <div className="flex items-center justify-between border-t px-3 py-2">
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            Rows per page
            <Select
              value={String(rowsPerPage)}
              onValueChange={(v) => {
                setRowsPerPage(Number(v));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-[82px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 20, 50, 100].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  aria-label="Previous page"
                />
              </PaginationItem>
              {Array.from({ length: totalPages }).map((_, i) => (
                <PaginationItem key={i}>
                  <PaginationLink
                    isActive={currentPage === i + 1}
                    onClick={() => setCurrentPage(i + 1)}
                  >
                    {i + 1}
                  </PaginationLink>
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationNext
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  aria-label="Next page"
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>

        <RecordPaymentDialog
          invoiceId={selectedInvoiceId}
          onClose={() => setSelectedInvoiceId(undefined)}
        />
      </div>
    );
  }
);
