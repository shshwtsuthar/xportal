'use client';

import {
  forwardRef,
  isValidElement,
  type ReactNode,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
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
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  useGetTablePreferences,
  useUpsertTablePreferences,
  getPaymentConfirmationsTableKey,
} from '@/src/hooks/useTablePreferences';
import { useGetUnconfirmedPayments } from '@/src/hooks/useGetUnconfirmedPayments';
import { useConfirmPayment } from '@/src/hooks/useConfirmPayment';
import {
  DEFAULT_VISIBLE_COLUMNS,
  getPaymentConfirmationsColumns,
  type ColumnDef,
  type RowType,
} from './paymentConfirmationsTableColumns';

const extractText = (node: ReactNode): string => {
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map((child) => extractText(child)).join(' ');
  }
  if (isValidElement(node)) {
    const props = node.props as { children?: ReactNode };
    return extractText(props.children);
  }
  return '';
};

export type PaymentConfirmationsDataTableRef = {
  getRows: () => RowType[];
};

export const PaymentConfirmationsDataTable = forwardRef<
  PaymentConfirmationsDataTableRef,
  Record<string, never>
>(function PaymentConfirmationsDataTable(_props, ref) {
  const { data, isLoading, isError } = useGetUnconfirmedPayments();
  const confirmPayment = useConfirmPayment();

  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const tableKey = getPaymentConfirmationsTableKey();
  const { data: prefs } = useGetTablePreferences(tableKey);
  const upsertPrefs = useUpsertTablePreferences();

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
    if (!hasPrefs) {
      persistPrefs({ visible_columns: defaults });
    }
  }, [prefs, persistPrefs]);

  const allColumns: ColumnDef[] = getPaymentConfirmationsColumns();
  const colById = useMemo(
    () => new Map(allColumns.map((col) => [col.id, col] as const)),
    [allColumns]
  );

  const rows = useMemo(() => {
    const baseRows = (data ?? []) as RowType[];
    if (!sortConfig) return baseRows;
    const { key, direction } = sortConfig;
    const col = colById.get(key);
    if (!col || !col.sortAccessor) return baseRows;
    return [...baseRows].sort((a, b) => {
      const av = col.sortAccessor?.(a) ?? '';
      const bv = col.sortAccessor?.(b) ?? '';
      if (av < bv) return direction === 'asc' ? -1 : 1;
      if (av > bv) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortConfig, colById]);

  const visibleDefs = useMemo(
    () => allColumns.filter((col) => visibleColumns.includes(col.id)),
    [allColumns, visibleColumns]
  );

  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return rows;
    const query = searchQuery.toLowerCase().trim();

    return rows.filter((row) =>
      visibleDefs.some((col) => {
        if (col.sortAccessor) {
          const sortableValue = String(
            col.sortAccessor(row) ?? ''
          ).toLowerCase();
          if (sortableValue.includes(query)) return true;
        }

        const rendered = col.render(row);
        if (typeof rendered === 'string') {
          return rendered.toLowerCase().includes(query);
        }
        if (typeof rendered === 'number') {
          return String(rendered).toLowerCase().includes(query);
        }
        if (Array.isArray(rendered)) {
          return rendered
            .map((child) => extractText(child))
            .join(' ')
            .toLowerCase()
            .includes(query);
        }
        if (rendered) {
          const text = extractText(rendered).toLowerCase();
          return text.includes(query);
        }
        return false;
      })
    );
  }, [rows, visibleDefs, searchQuery]);

  useImperativeHandle(ref, () => ({
    getRows: () => filteredRows,
  }));

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / rowsPerPage));
  const pagedRows = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredRows.slice(start, start + rowsPerPage);
  }, [filteredRows, currentPage, rowsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, rowsPerPage, data]);

  const handleSort = (key: string) => {
    setSortConfig((prev) => {
      if (prev?.key === key) {
        return prev.direction === 'asc' ? { key, direction: 'desc' } : null;
      }
      return { key, direction: 'asc' };
    });
  };

  const startResize = (id: string, startX: number) => {
    const col = colById.get(id);
    const base = columnWidths[id] ?? col?.width ?? 160;
    let latestWidth = base;
    const onMove = (event: MouseEvent) => {
      const delta = event.clientX - startX;
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

  const handleConfirm = async (paymentId: string) => {
    try {
      setConfirmingId(paymentId);
      await confirmPayment.mutateAsync({ paymentId });
      toast.success('Payment confirmed and synced to Xero');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to confirm payment'
      );
    } finally {
      setConfirmingId(null);
    }
  };

  if (isLoading)
    return <p className="text-muted-foreground text-sm">Loading payments…</p>;
  if (isError)
    return <p className="text-destructive text-sm">Failed to load payments.</p>;

  return (
    <div className="w-full overflow-hidden rounded-md border">
      <div className="border-b p-3">
        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            type="text"
            placeholder="Search all columns..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="pl-9 text-sm"
            aria-label="Search payments table"
          />
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="divide-x">
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
                    className={`text-left ${col.sortable ? 'hover:text-foreground' : 'cursor-default'}`}
                    onClick={() => {
                      if (!col.sortable) return;
                      handleSort(col.id);
                    }}
                    aria-label={`Sort by ${col.label}`}
                  >
                    {col.label}
                    {col.sortable && sortConfig?.key === col.id && (
                      <span className="text-muted-foreground ml-1 text-[10px]">
                        {sortConfig.direction === 'asc' ? '▲' : '▼'}
                      </span>
                    )}
                  </button>
                  <div
                    role="separator"
                    tabIndex={0}
                    className="ml-2 h-4 w-1 cursor-col-resize select-none"
                    onMouseDown={(event) => startResize(col.id, event.clientX)}
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
            <TableRow key={row.id} className="divide-x">
              {visibleDefs.map((col) => (
                <TableCell key={col.id}>{col.render(row)}</TableCell>
              ))}
              <TableCell className="text-right">
                <Button
                  size="sm"
                  onClick={() => handleConfirm(row.id as string)}
                  disabled={
                    confirmPayment.isPending &&
                    confirmingId === (row.id as string)
                  }
                >
                  {confirmPayment.isPending &&
                  confirmingId === (row.id as string)
                    ? 'Confirming...'
                    : 'Confirm Payment'}
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {pagedRows.length === 0 && (
            <TableRow className="divide-x">
              <TableCell
                colSpan={visibleDefs.length + 1}
                className="text-muted-foreground py-8 text-center text-sm"
              >
                {searchQuery.trim()
                  ? 'No payments match your search.'
                  : 'No unconfirmed payments. Everything is synced to Xero.'}
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
            onValueChange={(value) => {
              setRowsPerPage(Number(value));
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="h-8 w-[82px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[10, 20, 50, 100].map((count) => (
                <SelectItem key={count} value={String(count)}>
                  {count}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                aria-label="Previous page"
              />
            </PaginationItem>
            {Array.from({ length: totalPages }).map((_, index) => (
              <PaginationItem key={index}>
                <PaginationLink
                  isActive={currentPage === index + 1}
                  onClick={() => setCurrentPage(index + 1)}
                >
                  {index + 1}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                onClick={() =>
                  setCurrentPage((page) => Math.min(totalPages, page + 1))
                }
                aria-label="Next page"
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
});
