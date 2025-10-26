'use client';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from 'react';
import Link from 'next/link';
import { useGetApplications } from '@/src/hooks/useGetApplications';
import { Badge } from '@/components/ui/badge';
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
import { MoreHorizontal, Trash2, Check, X, GripVertical } from 'lucide-react';
import { format } from 'date-fns';
import { Tables } from '@/database.types';
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

  const persistPrefs = (next: Partial<TablePreferences>) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      upsertPrefs.mutate({
        tableKey,
        visible_columns: next.visible_columns ?? visibleColumns,
        column_widths: next.column_widths ?? columnWidths,
      });
    }, 300);
  };

  const allColumns: ColumnDef[] = getApplicationsColumns();

  const colById = new Map(allColumns.map((c) => [c.id, c] as const));

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
  }, [data, sortConfig, manualOrderIds]);

  // Pagination logic
  const totalPages = Math.ceil(rows.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedRows = rows.slice(startIndex, endIndex);

  // Reset to page 1 when data changes
  useEffect(() => {
    setCurrentPage(1);
  }, [data]);

  useImperativeHandle(
    ref,
    () => ({
      getRows: () => (rows as RowType[]) ?? [],
    }),
    [rows]
  );

  const isManualOrderActive = !!(manualOrderIds && manualOrderIds.length > 0);

  const ensureOrderInitialized = (currentRows: RowType[]) => {
    if (!manualOrderIds || manualOrderIds.length === 0) {
      setManualOrderIds(currentRows.map((r) => r.id));
    }
  };

  const moveIdBeforeId = (list: string[], fromId: string, toId: string) => {
    if (fromId === toId) return list;
    const next = [...list];
    const fromIdx = next.indexOf(fromId);
    const toIdx = next.indexOf(toId);
    if (fromIdx === -1 || toIdx === -1) return list;
    next.splice(fromIdx, 1);
    const insertAt = fromIdx < toIdx ? toIdx - 1 : toIdx;
    next.splice(insertAt, 0, fromId);
    return next;
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
                className={`divide-x ${draggingId === app.id ? 'opacity-50' : ''} ${dragOverId === app.id ? 'bg-muted/50' : ''}`}
              >
                <TableCell className="w-10 px-2">
                  <button
                    type="button"
                    className="hover:bg-muted mx-auto flex h-6 w-6 items-center justify-center rounded"
                    aria-label="Drag row to reorder"
                    aria-roledescription="Draggable row handle"
                    draggable
                    onDragStart={() => {
                      // initialize order from current rows and disable column sorting
                      ensureOrderInitialized(rows as RowType[]);
                      setSortConfig(null);
                      setDraggingId(app.id);
                    }}
                    onDragEnd={() => {
                      setDraggingId(null);
                      setDragOverId(null);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOverId(app.id);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (!draggingId) return;
                      ensureOrderInitialized(rows as RowType[]);
                      setManualOrderIds((prev) => {
                        const base =
                          prev && prev.length > 0
                            ? prev
                            : (rows as RowType[]).map((r) => r.id);
                        return moveIdBeforeId(base, draggingId, app.id);
                      });
                      setDraggingId(null);
                      setDragOverId(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
                      e.preventDefault();
                      ensureOrderInitialized(rows as RowType[]);
                      setSortConfig(null);
                      setManualOrderIds((prev) => {
                        const base =
                          prev && prev.length > 0
                            ? prev
                            : (rows as RowType[]).map((r) => r.id);
                        const currIdx = base.indexOf(app.id);
                        if (currIdx === -1) return base;
                        const targetIdx =
                          e.key === 'ArrowUp'
                            ? Math.max(0, currIdx - 1)
                            : Math.min(base.length - 1, currIdx + 1);
                        if (targetIdx === currIdx) return base;
                        const next = [...base];
                        next.splice(currIdx, 1);
                        next.splice(targetIdx, 0, app.id);
                        return next;
                      });
                    }}
                  >
                    <GripVertical className="text-muted-foreground h-4 w-4" />
                  </button>
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
                    No applications found.
                  </p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {rows.length > 0 && (
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
