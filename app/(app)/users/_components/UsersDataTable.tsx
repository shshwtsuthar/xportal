'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useGetUsers } from '@/src/hooks/useGetUsers';
import { Tables } from '@/database.types';

type UserWithAuthData = Tables<'profiles'> & {
  email?: string;
  created_at?: string;
};
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
import { format } from 'date-fns';

export function UsersDataTable() {
  const { data, isLoading, isError } = useGetUsers();
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
          aVal = [a.first_name, a.last_name].filter(Boolean).join(' ');
          bVal = [b.first_name, b.last_name].filter(Boolean).join(' ');
          break;
        case 'email':
          aVal = a.email || '';
          bVal = b.email || '';
          break;
        case 'role':
          aVal = a.role || '';
          bVal = b.role || '';
          break;
        case 'created_at':
          aVal = a.created_at ? new Date(a.created_at).getTime() : 0;
          bVal = b.created_at ? new Date(b.created_at).getTime() : 0;
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
    return <p className="text-muted-foreground text-sm">Loading users…</p>;
  if (isError)
    return <p className="text-destructive text-sm">Failed to load users.</p>;

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
              Name
            </SortableTableHead>
            <SortableTableHead
              onSort={() => handleSort('email')}
              sortDirection={
                sortConfig?.key === 'email' ? sortConfig.direction : null
              }
            >
              Email
            </SortableTableHead>
            <SortableTableHead
              onSort={() => handleSort('role')}
              sortDirection={
                sortConfig?.key === 'role' ? sortConfig.direction : null
              }
            >
              Role
            </SortableTableHead>
            <SortableTableHead
              onSort={() => handleSort('created_at')}
              sortDirection={
                sortConfig?.key === 'created_at' ? sortConfig.direction : null
              }
            >
              Joined Date
            </SortableTableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y">
          {rows.map((user: UserWithAuthData) => (
            <TableRow key={user.id} className="divide-x">
              <TableCell>
                {[user.first_name, user.last_name].filter(Boolean).join(' ') ||
                  '—'}
              </TableCell>
              <TableCell>{user.email ?? '—'}</TableCell>
              <TableCell>{user.role ?? '—'}</TableCell>
              <TableCell>
                {user.created_at
                  ? format(new Date(user.created_at), 'dd MMM yyyy')
                  : '—'}
              </TableCell>
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
                      <Link href={`/users/edit/${user.id}`}>Edit</Link>
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
                          <AlertDialogTitle>Delete User</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete the user. This action
                            cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={async () => {
                              try {
                                // TODO: Implement delete user functionality
                                toast.success('User deleted');
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
                <p className="text-muted-foreground text-sm">No users found.</p>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
