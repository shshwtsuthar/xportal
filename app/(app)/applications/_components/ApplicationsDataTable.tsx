'use client';

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
import { MoreHorizontal, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { Tables } from '@/database.types';
import { toast } from 'sonner';
import { useDeleteApplication } from '@/src/hooks/useDeleteApplication';

import type { Database } from '@/database.types';
type ApplicationStatus = Database['public']['Enums']['application_status'];

type Props = {
  statusFilter?: ApplicationStatus;
};

export function ApplicationsDataTable({ statusFilter }: Props) {
  const { data, isLoading, isError } = useGetApplications(statusFilter);
  const deleteMutation = useDeleteApplication();

  const rows = useMemo(() => data ?? [], [data]);

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id, {
      onSuccess: () => toast.success('Application deleted successfully'),
      onError: (error) => toast.error(`Failed to delete: ${error.message}`),
    });
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
    const canContinue = app.status === 'DRAFT';
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
          {canContinue ? (
            <DropdownMenuItem asChild>
              <Link href={`/applications/edit/${app.id}`}>Continue</Link>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem disabled>Continue</DropdownMenuItem>
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
    <div className="w-full overflow-hidden rounded-md border">
      <Table>
        <TableHeader>
          <TableRow className="divide-x">
            <TableHead>Student Name</TableHead>
            <TableHead>Qualification</TableHead>
            <TableHead>Status</TableHead>
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
              <TableCell>{app.qualification_id ? 'Selected' : '—'}</TableCell>
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
                  {app.status}
                </Badge>
              </TableCell>
              <TableCell>
                {formatDate(app.updated_at as unknown as string)}
              </TableCell>
              <TableCell className="text-right">{renderActions(app)}</TableCell>
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
  );
}
