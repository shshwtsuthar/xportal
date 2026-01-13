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
import { GripVertical, Search, Download } from 'lucide-react';
// removed unused Tables type
import { useGetInvoices } from '@/src/hooks/useGetInvoices';
import { useGenerateInvoicePdf } from '@/src/hooks/useGenerateInvoicePdf';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
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
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [generatingInvoiceId, setGeneratingInvoiceId] = useState<
      string | null
    >(null);
    const generatePdf = useGenerateInvoicePdf();

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

    const isManualOrderActive = !!(manualOrderIds && manualOrderIds.length > 0);

    const rows = useMemo(() => {
      const baseRows = (data ?? []) as RowType[];
      if (manualOrderIds && manualOrderIds.length > 0) {
        const orderIndex = new Map<string, number>();
        manualOrderIds.forEach((id, idx) => orderIndex.set(id, idx));
        return [...baseRows].sort((a, b) => {
          const ai = orderIndex.get(a.id as string) ?? Number.MAX_SAFE_INTEGER;
          const bi = orderIndex.get(b.id as string) ?? Number.MAX_SAFE_INTEGER;
          return ai - bi;
        });
      }
      if (!sortConfig) return baseRows;
      const { key, direction } = sortConfig;
      const col = colById.get(key);
      if (!col) return baseRows;
      const accessor =
        col.sortAccessor ??
        ((r: RowType) =>
          (r as unknown as Record<string, unknown>)[key] as string | number);
      return [...baseRows].sort((a, b) => {
        const av = accessor(a) ?? '';
        const bv = accessor(b) ?? '';
        if (av < bv) return direction === 'asc' ? -1 : 1;
        if (av > bv) return direction === 'asc' ? 1 : -1;
        return 0;
      });
    }, [data, sortConfig, manualOrderIds, colById]);

    const visibleDefs = useMemo(
      () => allColumns.filter((c) => visibleColumns.includes(c.id)),
      [allColumns, visibleColumns]
    );

    // Apply client-side search filtering
    const filteredRows = useMemo(() => {
      if (!searchQuery?.trim()) return rows;

      const query = searchQuery.toLowerCase().trim();
      return rows.filter((row) => {
        return visibleDefs.some((col) => {
          // Get searchable value from column
          let value: string = '';

          // For date columns, prefer rendered text (formatted date) over sortAccessor (timestamp)
          const isDateColumn =
            col.id === 'issue_date' ||
            col.id === 'due_date' ||
            col.id === 'last_email_sent_at';

          if (isDateColumn) {
            // For dates, use the rendered formatted text
            const rendered = col.render(row);
            if (typeof rendered === 'string') {
              value = rendered.toLowerCase();
            } else {
              value = String(rendered ?? '').toLowerCase();
            }
          } else if (col.sortAccessor) {
            // Use sortAccessor for raw data values
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
    }, [rows, searchQuery, visibleDefs]);

    useImperativeHandle(ref, () => ({ getRows: () => filteredRows }));

    const totalPages = Math.max(
      1,
      Math.ceil(filteredRows.length / rowsPerPage)
    );
    const pagedRows = useMemo(() => {
      const start = (currentPage - 1) * rowsPerPage;
      return filteredRows.slice(start, start + rowsPerPage);
    }, [filteredRows, currentPage, rowsPerPage]);

    // Reset to page 1 when data or search changes
    useEffect(() => {
      setCurrentPage(1);
    }, [data, searchQuery]);

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

    const handleSortClick = (key: string) => {
      if (isManualOrderActive) return; // sorting disabled during manual order
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
              aria-label="Search invoices table"
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
                      className={`text-left ${col.sortable ? (isManualOrderActive ? 'cursor-not-allowed opacity-50' : 'hover:text-foreground') : ''}`}
                      onClick={() => {
                        if (!col.sortable) return;
                        if (isManualOrderActive) return; // sorting disabled during manual order
                        handleSortClick(col.id);
                      }}
                      aria-label={`Sort by ${col.label}`}
                    >
                      {col.label}
                      {col.sortable &&
                        !isManualOrderActive &&
                        sortConfig?.key === col.id && (
                          <span className="text-muted-foreground ml-1 text-[10px]">
                            {sortConfig.direction === 'asc' ? '▲' : '▼'}
                          </span>
                        )}
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
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        const invoiceId = row.id as string;
                        setGeneratingInvoiceId(invoiceId);
                        try {
                          await generatePdf.mutateAsync({
                            invoiceId,
                          });
                          toast.success('Invoice PDF generated');
                        } catch (error) {
                          toast.error(
                            error instanceof Error
                              ? error.message
                              : 'Failed to generate invoice PDF'
                          );
                        } finally {
                          setGeneratingInvoiceId(null);
                        }
                      }}
                      disabled={generatingInvoiceId === row.id}
                      aria-label="Generate and download invoice PDF"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    {row.status !== 'PAID' && row.status !== 'VOID' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedInvoiceId(row.id as string)}
                      >
                        Record Payment
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {pagedRows.length === 0 && (
              <TableRow className="divide-x">
                <TableCell
                  colSpan={visibleDefs.length + 2}
                  className="text-muted-foreground py-8 text-center text-sm"
                >
                  {searchQuery.trim()
                    ? 'No invoices match your search.'
                    : 'No invoices to display.'}
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
