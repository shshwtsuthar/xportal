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
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
  MoreHorizontal,
  Archive,
  ArchiveRestore,
  DollarSign,
} from 'lucide-react';
import { Tables } from '@/database.types';
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
} from '@/src/hooks/useTablePreferences';
import {
  DEFAULT_VISIBLE_COLUMNS,
  getApplicationsColumns,
  type RowType,
} from './applicationsTableColumns';
import {
  DataTable,
  type DataTableRef,
  type DataTableColumnDef,
} from '@/components/data-table';
import { convertColumnDefs } from '@/components/data-table/migration-utils';
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
  const tableRef = useRef<DataTableRef<RowType>>(null);

  // Preferences: visible columns and widths persisted per user
  const tableKey = getApplicationsTableKey();
  const { data: prefs } = useGetTablePreferences(tableKey);

  const approveMutation = useApproveApplication();
  const recreateDraftMutation = useRecreateDraftApplication();

  // Convert old column format to new DataTable format
  const oldColumns = getApplicationsColumns();
  const columns: DataTableColumnDef<RowType>[] = useMemo(
    () => convertColumnDefs(oldColumns),
    []
  );

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
      getRows: () => tableRef.current?.getRows() ?? [],
    }),
    []
  );

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
      <DataTable<RowType>
        ref={tableRef}
        data={(data ?? []) as RowType[]}
        columns={columns}
        isLoading={isLoading}
        error={isError ? new Error('Failed to load applications') : null}
        enableSorting
        enableFiltering
        enableColumnResizing
        enableRowReordering
        enablePagination
        enableGlobalSearch
        defaultVisibleColumns={
          prefs?.visible_columns?.length
            ? prefs.visible_columns
            : DEFAULT_VISIBLE_COLUMNS
        }
        defaultPageSize={10}
        tableKey={tableKey}
        renderActions={renderActions}
      />

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
