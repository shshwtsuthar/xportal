'use client';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
  Fragment,
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
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
  GripVertical,
  Search,
  Archive,
  ArchiveRestore,
  DollarSign,
} from 'lucide-react';
// removed unused date-fns import
import { Tables } from '@/database.types';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useDeleteApplication } from '@/src/hooks/useDeleteApplication';
import { useUpdateApplication } from '@/src/hooks/useUpdateApplication';
import { useRecreateDraftApplication } from '@/src/hooks/useRecreateDraftApplication';
import { SendOfferComposeDialog } from '@/components/emails/SendOfferComposeDialog';
import { ManageDepositsDialog } from '@/components/deposits/ManageDepositsDialog';
import { useApproveApplication } from '@/src/hooks/useApproveApplication';
import { useGenerateOfferLetter } from '@/src/hooks/useGenerateOfferLetter';
import { useCheckGroupCapacity } from '@/src/hooks/useCheckGroupCapacity';
import { GroupCapacityDialog } from './GroupCapacityDialog';
import { ArchiveIcon, type ArchiveIconHandle } from '@/components/ui/archive';
import {
  RefreshCCWIcon,
  type RefreshCCWIconHandle,
} from '@/components/ui/refresh-ccw';
import {
  WashingMachineIcon,
  type WashingMachineIconHandle,
} from '@/components/ui/washing-machine';
import { UpvoteIcon, type UpvoteIconHandle } from '@/components/ui/upvote';
import {
  DownvoteIcon,
  type DownvoteIconHandle,
} from '@/components/ui/downvote';
import { BlocksIcon, type BlocksIconHandle } from '@/components/ui/blocks';
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

// Archive button component that handles hover animation
const ArchiveButton = ({ onArchive }: { onArchive: () => void }) => {
  const archiveIconRef = useRef<ArchiveIconHandle>(null);

  return (
    <Button
      variant="outline"
      size="sm"
      className="h-8 w-8 p-0"
      onClick={onArchive}
      onMouseEnter={() => archiveIconRef.current?.startAnimation()}
      onMouseLeave={() => archiveIconRef.current?.stopAnimation()}
      aria-label="Archive application"
    >
      <ArchiveIcon ref={archiveIconRef} size={16} />
    </Button>
  );
};

// Accept/Reject button group component that handles hover animations
const AcceptRejectButtonGroup = ({
  onAccept,
  onReject,
}: {
  onAccept: () => void;
  onReject: () => void;
}) => {
  const upvoteIconRef = useRef<UpvoteIconHandle>(null);
  const downvoteIconRef = useRef<DownvoteIconHandle>(null);

  return (
    <div className="flex w-full -space-x-px rounded-md shadow-sm">
      <Button
        variant="outline"
        size="sm"
        className="hover:bg-primary/10 hover:text-primary flex-1 justify-start gap-2 rounded-none rounded-l-md shadow-none transition-all duration-200 focus-visible:z-10"
        onClick={onAccept}
        onMouseEnter={() => upvoteIconRef.current?.startAnimation()}
        onMouseLeave={() => upvoteIconRef.current?.stopAnimation()}
        aria-label="Accept application"
      >
        <UpvoteIcon ref={upvoteIconRef} size={16} className="shrink-0" />
        <span className="whitespace-nowrap">Accept</span>
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="hover:bg-destructive/10 hover:text-destructive flex-1 justify-end gap-2 rounded-none rounded-r-md shadow-none transition-all duration-200 focus-visible:z-10"
        onClick={onReject}
        onMouseEnter={() => downvoteIconRef.current?.startAnimation()}
        onMouseLeave={() => downvoteIconRef.current?.stopAnimation()}
        aria-label="Reject application"
      >
        <span className="whitespace-nowrap">Reject</span>
        <DownvoteIcon ref={downvoteIconRef} size={16} className="shrink-0" />
      </Button>
    </div>
  );
};

// Approve button component that handles hover animation
const ApproveButton = ({
  onApprove,
  isPending,
  className,
}: {
  onApprove: () => void;
  isPending: boolean;
  className?: string;
}) => {
  const blocksIconRef = useRef<BlocksIconHandle>(null);

  return (
    <Button
      variant="outline"
      size="sm"
      className={className}
      onClick={onApprove}
      onMouseEnter={() => blocksIconRef.current?.startAnimation()}
      onMouseLeave={() => blocksIconRef.current?.stopAnimation()}
      disabled={isPending}
      aria-label="Approve application"
    >
      <BlocksIcon ref={blocksIconRef} size={16} className="mr-2 shrink-0" />
      {isPending ? 'Approving...' : 'Approve'}
    </Button>
  );
};

// Recreate Draft context menu item component that handles hover animation
const RecreateDraftMenuItem = ({
  onRecreateDraft,
}: {
  onRecreateDraft: () => void;
}) => {
  const refreshIconRef = useRef<RefreshCCWIconHandle>(null);

  return (
    <ContextMenuItem
      onClick={onRecreateDraft}
      onMouseEnter={() => refreshIconRef.current?.startAnimation()}
      onMouseLeave={() => refreshIconRef.current?.stopAnimation()}
    >
      <RefreshCCWIcon
        ref={refreshIconRef}
        size={16}
        className="mr-2 shrink-0"
      />
      Recreate Draft
    </ContextMenuItem>
  );
};

export type ApplicationsDataTableRef = {
  getRows: () => RowType[];
};

export const ApplicationsDataTable = forwardRef<
  ApplicationsDataTableRef,
  Props
>(function ApplicationsDataTable({ filters }: Props, ref) {
  const { data, isLoading, isError } = useGetApplications(filters);
  const generateOfferMutation = useGenerateOfferLetter();
  const deleteMutation = useDeleteApplication();
  const updateMutation = useUpdateApplication();
  const checkCapacityMutation = useCheckGroupCapacity();
  const [sendOfferDialog, setSendOfferDialog] = useState<{
    open: boolean;
    applicationId: string | null;
  }>({ open: false, applicationId: null });
  const [manageDepositsDialog, setManageDepositsDialog] = useState<{
    open: boolean;
    applicationId: string | null;
  }>({ open: false, applicationId: null });
  const [offerGeneratingId, setOfferGeneratingId] = useState<string | null>(
    null
  );
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [capacityDialogOpen, setCapacityDialogOpen] = useState(false);
  const [capacityCheckResult, setCapacityCheckResult] = useState<{
    hasCapacity: boolean;
    groupId: string;
    groupName?: string;
    currentCount?: number;
    maxCapacity?: number;
    alternatives?: Array<{
      id: string;
      name: string;
      current_enrollment_count: number;
      max_capacity: number;
      availableSpots: number;
    }>;
  } | null>(null);
  const [capacityCheckApplicationId, setCapacityCheckApplicationId] = useState<
    string | null
  >(null);
  const washingMachineRefs = useRef<Map<string, WashingMachineIconHandle>>(
    new Map()
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
  const recreateDraftMutation = useRecreateDraftApplication();

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
    const minWidth = col?.minWidth ?? 100;
    let latestWidth = base;
    const onMove = (e: MouseEvent) => {
      const delta = e.clientX - startX;
      const next = Math.max(minWidth, Math.min(600, base + delta));
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

  // Control washing machine animation based on offerGeneratingId
  useEffect(() => {
    // Use setTimeout to ensure refs are registered after render
    const timeoutId = setTimeout(() => {
      washingMachineRefs.current.forEach((ref, appId) => {
        if (appId === offerGeneratingId) {
          ref.startAnimation();
        } else {
          ref.stopAnimation();
        }
      });
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [offerGeneratingId]);

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

  const handleArchive = (id: string) => {
    updateMutation.mutate(
      { id, status: 'ARCHIVED' },
      {
        onSuccess: () => toast.success('Application archived successfully'),
        onError: (error) => toast.error(`Failed to archive: ${error.message}`),
      }
    );
  };

  const handleUnarchive = (id: string) => {
    updateMutation.mutate(
      { id, status: 'DRAFT' },
      {
        onSuccess: () => toast.success('Application unarchived successfully'),
        onError: (error) =>
          toast.error(`Failed to unarchive: ${error.message}`),
      }
    );
  };

  if (isLoading) {
    // Show skeleton table structure while loading
    const skeletonRowCount = rowsPerPage || 10;
    const defaultVisibleColumns =
      visibleColumns.length > 0 ? visibleColumns : DEFAULT_VISIBLE_COLUMNS;

    return (
      <div className="w-full overflow-x-auto rounded-md border">
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
              {defaultVisibleColumns.map((id, index) => {
                const c = colById.get(id)!;
                const baseWidth = columnWidths[id] ?? c.width ?? 160;
                const minWidth = c.minWidth;
                const width = minWidth
                  ? Math.max(baseWidth, minWidth)
                  : baseWidth;
                const isLastColumn = index === defaultVisibleColumns.length - 1;
                return (
                  <TableHead
                    key={id}
                    style={{ width, ...(minWidth && { minWidth }) }}
                    className={`text-muted-foreground group relative h-12 px-0 text-left align-middle font-medium ${isLastColumn ? 'border-r-0' : ''}`}
                  >
                    <div className="flex w-full items-center gap-2 px-4">
                      <Skeleton className="h-4 w-24" />
                    </div>
                  </TableHead>
                );
              })}
              <TableHead
                style={{ width: 240 }}
                className="bg-background before:bg-border sticky right-0 z-20 border-l-0 px-4 text-right before:absolute before:top-0 before:bottom-0 before:left-0 before:w-px before:content-['']"
              >
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
                {defaultVisibleColumns.map((id, colIndex) => {
                  const c = colById.get(id)!;
                  const baseWidth = columnWidths[id] ?? c.width ?? 160;
                  const minWidth = c.minWidth;
                  const width = minWidth
                    ? Math.max(baseWidth, minWidth)
                    : baseWidth;
                  const isLastColumn =
                    colIndex === defaultVisibleColumns.length - 1;
                  return (
                    <TableCell
                      key={`skeleton-${index}-${id}`}
                      style={{ width, ...(minWidth && { minWidth }) }}
                      className={`px-4 ${isLastColumn ? 'border-r-0' : ''}`}
                    >
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  );
                })}
                <TableCell
                  style={{ width: 240 }}
                  className="bg-background before:bg-border sticky right-0 z-10 border-l-0 px-4 text-right before:absolute before:top-0 before:bottom-0 before:left-0 before:w-px before:content-['']"
                >
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
      <p className="text-destructive text-sm">Failed to load applications.</p>
    );
  }

  const renderActions = (app: Tables<'applications'>) => {
    if (app.status === 'ARCHIVED') {
      return (
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => handleUnarchive(app.id)}
          aria-label="Unarchive application"
        >
          <ArchiveRestore className="mr-2 h-4 w-4" />
          Unarchive
        </Button>
      );
    }

    const handleGenerateOffer = async () => {
      if (generateOfferMutation.isPending) {
        return;
      }
      setOfferGeneratingId(app.id);
      try {
        const { signedUrl } = await generateOfferMutation.mutateAsync({
          applicationId: app.id,
        });
        if (signedUrl) {
          window.open(signedUrl, '_blank', 'noopener,noreferrer');
        }
        toast.success('Offer generated');
      } catch (e) {
        toast.error(
          `Failed to generate offer: ${String((e as Error).message || e)}`
        );
      } finally {
        setOfferGeneratingId(null);
      }
    };
    const isRowGenerating =
      generateOfferMutation.isPending && offerGeneratingId === app.id;

    // For OFFER_SENT status, show Accept/Reject button group and Manage Deposits button
    if (app.status === 'OFFER_SENT') {
      return (
        <div className="flex w-full min-w-0 flex-col gap-2">
          <AcceptRejectButtonGroup
            onAccept={() => handleAccept(app.id)}
            onReject={() => handleReject(app.id)}
          />
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() =>
              setManageDepositsDialog({ open: true, applicationId: app.id })
            }
            aria-label="Manage Deposits"
          >
            <DollarSign className="mr-2 h-4 w-4" />
            Manage Deposits
          </Button>
        </div>
      );
    }

    // For ACCEPTED status, show Approve button and Archive button
    if (app.status === 'ACCEPTED') {
      const isRowApproving = approvingId === app.id;
      return (
        <div className="flex w-full min-w-0 items-center gap-2">
          <ApproveButton
            onApprove={async () => {
              if (
                approveMutation.isPending ||
                checkCapacityMutation.isPending
              ) {
                return;
              }
              setApprovingId(app.id);
              setCapacityCheckApplicationId(app.id);
              try {
                // Step 1: Check group capacity
                const result = await checkCapacityMutation.mutateAsync({
                  applicationId: app.id,
                });

                if (result.hasCapacity) {
                  // Group has capacity, proceed directly
                  await approveMutation.mutateAsync({ applicationId: app.id });
                  toast.success('Application approved');
                  setApprovingId(null);
                } else {
                  // Group is full, show dialog with alternatives
                  setCapacityCheckResult(result);
                  setCapacityDialogOpen(true);
                  // Note: approvingId will be cleared when dialog closes or confirms
                }
              } catch (e) {
                toast.error(`Failed: ${String((e as Error).message || e)}`);
                setApprovingId(null);
                setCapacityCheckApplicationId(null);
              }
            }}
            isPending={isRowApproving}
            className="min-w-0 flex-1 shrink overflow-hidden"
          />
          <div className="shrink-0">
            <ArchiveButton onArchive={() => handleArchive(app.id)} />
          </div>
        </div>
      );
    }

    // For REJECTED status, show no actions
    if (app.status === 'REJECTED') {
      return <span className="text-muted-foreground">—</span>;
    }

    // For APPROVED status, show no actions
    if (app.status === 'APPROVED') {
      return null;
    }

    // For SUBMITTED status, show Generate Offer button
    if (app.status === 'SUBMITTED') {
      return (
        <div className="flex w-full min-w-0 items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="min-w-0 flex-1 shrink overflow-hidden"
            onClick={handleGenerateOffer}
            disabled={isRowGenerating}
            aria-busy={isRowGenerating}
            aria-label="Generate Offer"
          >
            <span className="flex min-w-0 items-center truncate">
              {isRowGenerating && (
                <WashingMachineIcon
                  ref={(node) => {
                    if (node) {
                      washingMachineRefs.current.set(app.id, node);
                      // Start animation immediately if this app is generating
                      // Use requestAnimationFrame to ensure the component is fully mounted
                      requestAnimationFrame(() => {
                        if (offerGeneratingId === app.id) {
                          node.startAnimation();
                        }
                      });
                    } else {
                      washingMachineRefs.current.delete(app.id);
                    }
                  }}
                  size={16}
                  className="mr-2 shrink-0"
                />
              )}
              <span className="truncate">
                {isRowGenerating ? 'Generating…' : 'Generate Offer'}
              </span>
            </span>
          </Button>
          <div className="shrink-0">
            <ArchiveButton onArchive={() => handleArchive(app.id)} />
          </div>
        </div>
      );
    }

    // For OFFER_GENERATED status, show Send Offer button, Manage Deposits button, and Archive button
    if (app.status === 'OFFER_GENERATED') {
      return (
        <div className="flex w-full min-w-0 flex-col gap-2">
          <div className="flex w-full min-w-0 items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="min-w-0 flex-1 shrink overflow-hidden"
              onClick={() =>
                setSendOfferDialog({ open: true, applicationId: app.id })
              }
              aria-label="Send Offer"
            >
              <span className="truncate">Send Offer</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={() =>
                setManageDepositsDialog({ open: true, applicationId: app.id })
              }
              aria-label="Manage Deposits"
            >
              <DollarSign className="h-4 w-4" />
            </Button>
            <div className="shrink-0">
              <ArchiveButton onArchive={() => handleArchive(app.id)} />
            </div>
          </div>
        </div>
      );
    }

    // For DRAFT status, show Edit and Archive buttons
    if (app.status === 'DRAFT') {
      return (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            asChild
            aria-label="Edit application"
          >
            <Link href={`/applications/edit/${app.id}`}>Edit</Link>
          </Button>
          <ArchiveButton onArchive={() => handleArchive(app.id)} />
        </div>
      );
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
          {/* Other status actions can go here if needed */}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  return (
    <>
      <div className="w-full overflow-x-auto rounded-md border">
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
        <Table>
          <TableHeader>
            <TableRow className="divide-x">
              <TableHead
                className="w-10 px-2 text-center"
                aria-label="Manual order column"
              />
              {visibleColumns.map((id, index) => {
                const c = colById.get(id)!;
                const baseWidth = columnWidths[id] ?? c.width ?? 160;
                const minWidth = c.minWidth;
                const width = minWidth
                  ? Math.max(baseWidth, minWidth)
                  : baseWidth;
                const active =
                  sortConfig?.key === id ? sortConfig.direction : null;
                const isLastColumn = index === visibleColumns.length - 1;
                return (
                  <TableHead
                    key={id}
                    style={{ width, ...(minWidth && { minWidth }) }}
                    className={`text-muted-foreground group relative h-12 px-0 text-left align-middle font-medium ${isLastColumn ? 'border-r-0' : ''}`}
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
                          const minWidth = c.minWidth ?? 100;
                          const next = Math.max(
                            minWidth,
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
                style={{ width: 240 }}
                className="bg-background before:bg-border sticky right-0 z-20 border-l-0 px-4 text-right before:absolute before:top-0 before:bottom-0 before:left-0 before:w-px before:content-['']"
              >
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y">
            {paginatedRows.map((app) => {
              const shouldShowContextMenu =
                app.status !== 'ARCHIVED' && app.status !== 'APPROVED';

              const tableRow = (
                <TableRow
                  className="divide-x"
                  draggable
                  onDragStart={() => onDragStart(app.id)}
                  onDragEnter={() => onDragEnter(app.id)}
                  onDragEnd={onDragEnd}
                >
                  <TableCell className="text-muted-foreground w-8">
                    <GripVertical className="h-4 w-4" />
                  </TableCell>
                  {visibleColumns.map((id, index) => {
                    const c = colById.get(id)!;
                    const baseWidth = columnWidths[id] ?? c.width ?? 160;
                    const minWidth = c.minWidth;
                    const width = minWidth
                      ? Math.max(baseWidth, minWidth)
                      : baseWidth;
                    const isLastColumn = index === visibleColumns.length - 1;
                    return (
                      <TableCell
                        key={`${app.id}-${id}`}
                        style={{ width, ...(minWidth && { minWidth }) }}
                        className={`${c.noTruncate ? 'px-4' : 'truncate px-4'} ${isLastColumn ? 'border-r-0' : ''}`}
                      >
                        {c.render(app as RowType)}
                      </TableCell>
                    );
                  })}
                  <TableCell
                    style={{ width: 240 }}
                    className="bg-background before:bg-border sticky right-0 z-10 border-l-0 px-4 text-right before:absolute before:top-0 before:bottom-0 before:left-0 before:w-px before:content-['']"
                  >
                    {renderActions(app)}
                  </TableCell>
                </TableRow>
              );

              if (!shouldShowContextMenu) {
                return <Fragment key={app.id}>{tableRow}</Fragment>;
              }

              return (
                <ContextMenu key={app.id}>
                  <ContextMenuTrigger asChild>{tableRow}</ContextMenuTrigger>
                  <ContextMenuContent>
                    <RecreateDraftMenuItem
                      onRecreateDraft={async () => {
                        try {
                          const result =
                            await recreateDraftMutation.mutateAsync({
                              applicationId: app.id,
                            });
                          toast.success(
                            `Draft recreated successfully! New application: ${result.newApplicationDisplayId}`
                          );
                        } catch (error) {
                          toast.error(
                            `Failed to recreate draft: ${error instanceof Error ? error.message : 'Unknown error'}`
                          );
                        }
                      }}
                    />
                    <ContextMenuSeparator />
                    {app.status !== 'ARCHIVED' && (
                      <ContextMenuItem onClick={() => handleArchive(app.id)}>
                        <Archive className="mr-2 h-4 w-4" />
                        Archive
                      </ContextMenuItem>
                    )}
                  </ContextMenuContent>
                </ContextMenu>
              );
            })}
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

      {sendOfferDialog.applicationId && (
        <SendOfferComposeDialog
          applicationId={sendOfferDialog.applicationId}
          open={sendOfferDialog.open}
          onOpenChange={(open) =>
            setSendOfferDialog({
              open,
              applicationId: open ? sendOfferDialog.applicationId : null,
            })
          }
        />
      )}

      {manageDepositsDialog.applicationId && (
        <ManageDepositsDialog
          applicationId={manageDepositsDialog.applicationId}
          open={manageDepositsDialog.open}
          onOpenChange={(open) =>
            setManageDepositsDialog({
              open,
              applicationId: open ? manageDepositsDialog.applicationId : null,
            })
          }
        />
      )}

      {capacityCheckResult && capacityCheckApplicationId && (
        <GroupCapacityDialog
          open={capacityDialogOpen}
          onOpenChange={(open) => {
            setCapacityDialogOpen(open);
            if (!open) {
              // User cancelled, clear approving state
              setApprovingId(null);
              setCapacityCheckApplicationId(null);
              setCapacityCheckResult(null);
            }
          }}
          currentGroupName={capacityCheckResult.groupName || ''}
          currentCount={capacityCheckResult.currentCount || 0}
          maxCapacity={capacityCheckResult.maxCapacity || 0}
          alternatives={capacityCheckResult.alternatives || []}
          onConfirm={async (newGroupId: string) => {
            try {
              await approveMutation.mutateAsync({
                applicationId: capacityCheckApplicationId,
                newGroupId,
              });
              toast.success('Application approved with new group');
              setCapacityDialogOpen(false);
              setApprovingId(null);
              setCapacityCheckApplicationId(null);
              setCapacityCheckResult(null);
            } catch (e) {
              toast.error(
                `Approve failed: ${String((e as Error).message || e)}`
              );
            }
          }}
          isConfirming={approveMutation.isPending}
        />
      )}
    </>
  );
});
