'use client';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { useCallback } from 'react';
import Link from 'next/link';
import { useGetApplications } from '@/src/hooks/useGetApplications';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
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
import {
  MoreHorizontal,
  Trash2,
  Check,
  X,
  GripVertical,
  Search,
} from 'lucide-react';
// removed unused date-fns import
import { Tables } from '@/database.types';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useDeleteApplication } from '@/src/hooks/useDeleteApplication';
import { useUpdateApplication } from '@/src/hooks/useUpdateApplication';
import { SendOfferDialog } from './SendOfferDialog';
import { useApproveApplication } from '@/src/hooks/useApproveApplication';
import {
  getApplicationsTableKey,
  useGetTablePreferences,
  useUpsertTablePreferences,
  type TablePreferences,
} from '@/src/hooks/useTablePreferences';
import {
  DEFAULT_VISIBLE_COLUMNS,
  getApplicationsColumns,
  type ColumnDef,
  type RowType,
} from './applicationsTableColumns';

import type { ApplicationFilters } from '@/src/hooks/useApplicationsFilters';

type Props = {
  filters?: ApplicationFilters;
};

export type ApplicationsDataTableRef = {
  getRows: () => RowType[];
};

export const ApplicationsDataTable = forwardRef<
  ApplicationsDataTableRef,
  Props
>(function ApplicationsDataTable({ filters }: Props, ref) {
  const { data, isLoading, isError } = useGetApplications(filters);
  const deleteMutation = useDeleteApplication();
  const updateMutation = useUpdateApplication();
  const [sendOfferDialog, setSendOfferDialog] = useState<{
    open: boolean;
    application: Tables<'applications'> | null;
  }>({ open: false, application: null });
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

  // Preferences: visible columns and widths persisted per user
  const tableKey = getApplicationsTableKey();
  const { data: prefs } = useGetTablePreferences(tableKey);
  const upsertPrefs = useUpsertTablePreferences();
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!prefs) return;
    // Defaults if none set: keep current six columns
    const defaults = DEFAULT_VISIBLE_COLUMNS;
    const hasPrefs = prefs.visible_columns.length > 0;
    const nextVisible = hasPrefs ? prefs.visible_columns : defaults;
    setVisibleColumns(nextVisible);
    setColumnWidths(prefs.column_widths || {});

    // Persist defaults once if there are no stored preferences
    if (!hasPrefs) {
      persistPrefs({ visible_columns: defaults });
    }
  }, [prefs]);

  const approveMutation = useApproveApplication();

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

  const persistPrefs = useCallback(
    (next: Partial<TablePreferences>) => {
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

  const allColumns: ColumnDef[] = getApplicationsColumns();

  const colById = useMemo(
    () => new Map(allColumns.map((c) => [c.id, c] as const)),
    [allColumns]
  );

  // column toggling is handled via external Columns menu

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
          col.id === 'requested_start' ||
          col.id === 'updated_at' ||
          col.id === 'created_at';

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

  const isManualOrderActive = !!(manualOrderIds && manualOrderIds.length > 0);

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

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id, {
      onSuccess: () => toast.success('Application deleted successfully'),
      onError: (error) => toast.error(`Failed to delete: ${error.message}`),
    });
  };

  const handleAccept = (id: string) => {
    updateMutation.mutate(
      { id, status: 'ACCEPTED' },
      {
        onSuccess: () => toast.success('Application accepted successfully'),
        onError: (error) => toast.error(`Failed to accept: ${error.message}`),
      }
    );
  };

  const handleReject = (id: string) => {
    updateMutation.mutate(
      { id, status: 'REJECTED' },
      {
        onSuccess: () => toast.success('Application rejected successfully'),
        onError: (error) => toast.error(`Failed to reject: ${error.message}`),
      }
    );
  };

  if (isLoading) {
    return (
      <p className="text-muted-foreground text-sm">Loading applications…</p>
    );
  }
  if (isError) {
    return (
      <p className="text-destructive text-sm">Failed to load applications.</p>
    );
  }

  const renderActions = (app: Tables<'applications'>) => {
    const handleGenerateOffer = async () => {
      try {
        const res = await fetch('/api/generate-offer-letter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ applicationId: app.id }),
        });
        if (!res.ok) throw new Error('Failed to generate');
        const { signedUrl } = await res.json();
        if (signedUrl) {
          window.open(signedUrl, '_blank', 'noopener,noreferrer');
        }
        toast.success('Offer generated');
      } catch (e) {
        toast.error(
          `Failed to generate offer: ${String((e as Error).message || e)}`
        );
      }
    };

    // For OFFER_SENT status, show Accept/Reject buttons
    if (app.status === 'OFFER_SENT') {
      return (
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => handleAccept(app.id)}
            aria-label="Accept application"
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button
            variant="destructive"
            size="icon"
            onClick={() => handleReject(app.id)}
            aria-label="Reject application"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      );
    }

    // For ACCEPTED status, show Approve button
    if (app.status === 'ACCEPTED') {
      return (
        <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            try {
              await approveMutation.mutateAsync({ applicationId: app.id });
              toast.success('Application approved');
            } catch (e) {
              toast.error(
                `Approve failed: ${String((e as Error).message || e)}`
              );
            }
          }}
          disabled={approveMutation.isPending}
          aria-label="Approve application"
        >
          <Check className="mr-2 h-4 w-4" />
          {approveMutation.isPending ? 'Approving...' : 'Approve'}
        </Button>
      );
    }

    // For REJECTED status, show no actions
    if (app.status === 'REJECTED') {
      return <span className="text-muted-foreground">—</span>;
    }

    // For other statuses, show dropdown menu
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="h-8 w-8 p-0"
            aria-label="Row actions"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {app.status === 'DRAFT' && (
            <DropdownMenuItem asChild>
              <Link href={`/applications/edit/${app.id}`}>Continue</Link>
            </DropdownMenuItem>
          )}
          {app.status === 'SUBMITTED' && (
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                handleGenerateOffer();
              }}
            >
              Generate Offer
            </DropdownMenuItem>
          )}
          {app.status === 'OFFER_GENERATED' && (
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                setSendOfferDialog({ open: true, application: app });
              }}
            >
              Send Offer Letter
            </DropdownMenuItem>
          )}
          {app.status === 'DRAFT' && (
            <>
              <DropdownMenuSeparator />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={(e) => e.preventDefault()}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Application</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure? This will permanently delete this
                      application. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleDelete(app.id)}
                      className="bg-destructive hover:bg-destructive/90 text-white"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  return (
    <>
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
              aria-label="Search applications table"
            />
          </div>
        </div>
        <Table className="table-fixed">
          <TableHeader>
            <TableRow className="divide-x">
              <TableHead
                className="w-10 px-2 text-center"
                aria-label="Manual order column"
              />
              {visibleColumns.map((id) => {
                const c = colById.get(id)!;
                const width = columnWidths[id] ?? c.width ?? 160;
                const active =
                  sortConfig?.key === id ? sortConfig.direction : null;
                return (
                  <TableHead
                    key={id}
                    style={{ width }}
                    className={`text-muted-foreground group relative h-12 px-0 text-left align-middle font-medium`}
                  >
                    <button
                      type="button"
                      className={`flex w-full items-center gap-2 px-4 ${c.sortable ? (isManualOrderActive ? 'cursor-not-allowed opacity-50' : 'hover:text-foreground') : ''}`}
                      onClick={() => {
                        if (!c.sortable) return;
                        if (isManualOrderActive) return; // sorting disabled during manual order
                        handleSort(id);
                      }}
                      aria-label={`Sort by ${c.label}`}
                    >
                      <span className="truncate">{c.label}</span>
                      {c.sortable && !isManualOrderActive && (
                        <span className="text-muted-foreground ml-1 text-[10px]">
                          {active === 'asc'
                            ? '▲'
                            : active === 'desc'
                              ? '▼'
                              : ''}
                        </span>
                      )}
                    </button>
                    <div
                      role="separator"
                      aria-orientation="vertical"
                      aria-label={`Resize ${c.label}`}
                      tabIndex={0}
                      className="hover:bg-border focus-visible:ring-ring absolute top-0 right-0 h-full w-1 cursor-col-resize focus-visible:ring-1 focus-visible:ring-offset-1 focus-visible:outline-hidden"
                      onMouseDown={(e) => startResize(id, e.clientX)}
                      onKeyDown={(e) => {
                        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                          e.preventDefault();
                          const delta = e.key === 'ArrowLeft' ? -8 : 8;
                          const next = Math.max(
                            100,
                            Math.min(
                              600,
                              (columnWidths[id] ?? c.width ?? 160) + delta
                            )
                          );
                          const updated = { ...columnWidths, [id]: next };
                          setColumnWidths(updated);
                          persistPrefs({ column_widths: updated });
                        }
                      }}
                    />
                  </TableHead>
                );
              })}
              <TableHead
                style={{ width: 160 }}
                className="bg-background sticky right-0 z-20 border-l px-4 text-right"
              >
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y">
            {paginatedRows.map((app) => (
              <TableRow
                key={app.id}
                className="divide-x"
                draggable
                onDragStart={() => onDragStart(app.id)}
                onDragEnter={() => onDragEnter(app.id)}
                onDragEnd={onDragEnd}
              >
                <TableCell className="text-muted-foreground w-8">
                  <GripVertical className="h-4 w-4" />
                </TableCell>
                {visibleColumns.map((id) => {
                  const c = colById.get(id)!;
                  const width = columnWidths[id] ?? c.width ?? 160;
                  return (
                    <TableCell
                      key={`${app.id}-${id}`}
                      style={{ width }}
                      className="truncate px-4"
                    >
                      {c.render(app as RowType)}
                    </TableCell>
                  );
                })}
                <TableCell
                  style={{ width: 160 }}
                  className="bg-background sticky right-0 z-10 border-l px-4 text-right"
                >
                  {renderActions(app)}
                </TableCell>
              </TableRow>
            ))}
            {paginatedRows.length === 0 && (
              <TableRow className="divide-x">
                <TableCell colSpan={visibleColumns.length + 2}>
                  <p className="text-muted-foreground text-sm">
                    {searchQuery.trim()
                      ? 'No applications match your search.'
                      : 'No applications found.'}
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

      {sendOfferDialog.application && (
        <SendOfferDialog
          application={sendOfferDialog.application}
          open={sendOfferDialog.open}
          onOpenChange={(open) =>
            setSendOfferDialog({
              open,
              application: open ? sendOfferDialog.application : null,
            })
          }
        />
      )}
    </>
  );
});
