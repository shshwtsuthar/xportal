'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMemo } from 'react';
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
import { MoreHorizontal, Trash2, Check, X } from 'lucide-react';
import { format } from 'date-fns';
import { Tables } from '@/database.types';
import { toast } from 'sonner';
import { useDeleteApplication } from '@/src/hooks/useDeleteApplication';
import { useUpdateApplication } from '@/src/hooks/useUpdateApplication';
import { SendOfferDialog } from './SendOfferDialog';
import { useApproveApplication } from '@/src/hooks/useApproveApplication';

import type { Database } from '@/database.types';
type ApplicationStatus = Database['public']['Enums']['application_status'];

type Props = {
  statusFilter?: ApplicationStatus;
};

export function ApplicationsDataTable({ statusFilter }: Props) {
  const { data, isLoading, isError } = useGetApplications(statusFilter);
  const deleteMutation = useDeleteApplication();
  const updateMutation = useUpdateApplication();
  const [sendOfferDialog, setSendOfferDialog] = useState<{
    open: boolean;
    application: Tables<'applications'> | null;
  }>({ open: false, application: null });

  const rows = useMemo(() => data ?? [], [data]);
  const approveMutation = useApproveApplication();

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

  const formatDate = (value: string | null) => {
    if (!value) return '';
    try {
      return format(new Date(value), 'dd MMM yyyy');
    } catch {
      return String(value);
    }
  };

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
        <Table>
          <TableHeader>
            <TableRow className="divide-x">
              <TableHead>Student Name</TableHead>
              <TableHead>Program</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Requested Start</TableHead>
              <TableHead>Updated At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y">
            {rows.map((app) => (
              <TableRow key={app.id} className="divide-x">
                <TableCell>
                  {[app.first_name, app.last_name].filter(Boolean).join(' ') ||
                    '—'}
                </TableCell>
                <TableCell>{app.program_id ? 'Selected' : '—'}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      app.status === 'REJECTED'
                        ? 'destructive'
                        : app.status === 'SUBMITTED'
                          ? 'default'
                          : 'secondary'
                    }
                  >
                    {app.status === 'OFFER_GENERATED'
                      ? 'Offer Generated'
                      : app.status === 'OFFER_SENT'
                        ? 'Offer Sent'
                        : app.status === 'ACCEPTED'
                          ? 'Accepted'
                          : app.status === 'DRAFT'
                            ? 'Draft'
                            : app.status === 'SUBMITTED'
                              ? 'Submitted'
                              : app.status === 'REJECTED'
                                ? 'Rejected'
                                : app.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {formatDate(app.requested_start_date as string | null)}
                </TableCell>
                <TableCell>
                  {formatDate(app.updated_at as unknown as string)}
                </TableCell>
                <TableCell className="text-right">
                  {renderActions(app)}
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow className="divide-x">
                <TableCell colSpan={5}>
                  <p className="text-muted-foreground text-sm">
                    No applications found.
                  </p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
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
}
