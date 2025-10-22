'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useGetAgents } from '@/src/hooks/useGetAgents';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { SortableTableHead } from '@/components/ui/sortable-table-head';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Trash2 } from 'lucide-react';
import { useDeleteAgent } from '@/src/hooks/useDeleteAgent';
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
import { toast } from 'sonner';

export function AgentsDataTable() {
  const { data, isLoading, isError } = useGetAgents();
  const deleteMutation = useDeleteAgent();
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);

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
    const baseRows = data ?? [];
    if (!sortConfig) return baseRows;

    return [...baseRows].sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;

      switch (sortConfig.key) {
        case 'name':
          aVal = a.name || '';
          bVal = b.name || '';
          break;
        case 'contact_person':
          aVal = a.contact_person || '';
          bVal = b.contact_person || '';
          break;
        case 'contact_email':
          aVal = a.contact_email || '';
          bVal = b.contact_email || '';
          break;
        case 'contact_phone':
          aVal = a.contact_phone || '';
          bVal = b.contact_phone || '';
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortConfig]);

  if (isLoading)
    return <p className="text-muted-foreground text-sm">Loading agents…</p>;
  if (isError)
    return <p className="text-destructive text-sm">Failed to load agents.</p>;

  return (
    <div className="w-full overflow-hidden rounded-md border">
      <Table>
        <TableHeader>
          <TableRow className="divide-x">
            <SortableTableHead
              onSort={() => handleSort('name')}
              sortDirection={
                sortConfig?.key === 'name' ? sortConfig.direction : null
              }
            >
              Agent Name
            </SortableTableHead>
            <SortableTableHead
              onSort={() => handleSort('contact_person')}
              sortDirection={
                sortConfig?.key === 'contact_person'
                  ? sortConfig.direction
                  : null
              }
            >
              Contact Person
            </SortableTableHead>
            <SortableTableHead
              onSort={() => handleSort('contact_email')}
              sortDirection={
                sortConfig?.key === 'contact_email'
                  ? sortConfig.direction
                  : null
              }
            >
              Contact Email
            </SortableTableHead>
            <SortableTableHead
              onSort={() => handleSort('contact_phone')}
              sortDirection={
                sortConfig?.key === 'contact_phone'
                  ? sortConfig.direction
                  : null
              }
            >
              Contact Phone
            </SortableTableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y">
          {rows.map((a) => (
            <TableRow key={a.id} className="divide-x">
              <TableCell>{a.name}</TableCell>
              <TableCell>{a.contact_person ?? '—'}</TableCell>
              <TableCell>{a.contact_email ?? '—'}</TableCell>
              <TableCell>{a.contact_phone ?? '—'}</TableCell>
              <TableCell className="text-right">
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
                    <DropdownMenuItem asChild>
                      <Link href={`/agents/edit/${a.id}`}>Edit</Link>
                    </DropdownMenuItem>
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
                          <AlertDialogTitle>Delete Agent</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete the agent. This action
                            cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={async () => {
                              try {
                                await deleteMutation.mutateAsync(
                                  a.id as string
                                );
                                toast.success('Agent deleted');
                              } catch (e) {
                                toast.error(String((e as Error).message || e));
                              }
                            }}
                            className="bg-destructive hover:bg-destructive/90 text-white"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
          {rows.length === 0 && (
            <TableRow className="divide-x">
              <TableCell colSpan={5}>
                <p className="text-muted-foreground text-sm">
                  No agents found.
                </p>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
