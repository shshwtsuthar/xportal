'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useGetSubjects } from '@/src/hooks/useGetSubjects';
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
import { useDeleteSubject } from '@/src/hooks/useDeleteSubject';
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

export function SubjectsDataTable() {
  const { data, isLoading, isError } = useGetSubjects();
  const deleteMutation = useDeleteSubject();
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
        case 'code':
          aVal = a.code || '';
          bVal = b.code || '';
          break;
        case 'name':
          aVal = a.name || '';
          bVal = b.name || '';
          break;
        case 'field_of_education':
          aVal = a.field_of_education_id || '';
          bVal = b.field_of_education_id || '';
          break;
        case 'nominal_hours':
          aVal = a.nominal_hours || 0;
          bVal = b.nominal_hours || 0;
          break;
        case 'vet_flag':
          aVal = a.vet_flag || '';
          bVal = b.vet_flag || '';
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
    return <p className="text-muted-foreground text-sm">Loading subjects…</p>;
  if (isError)
    return <p className="text-destructive text-sm">Failed to load subjects.</p>;

  return (
    <div className="w-full overflow-hidden rounded-md border">
      <Table>
        <TableHeader>
          <TableRow className="divide-x">
            <SortableTableHead
              onSort={() => handleSort('code')}
              sortDirection={
                sortConfig?.key === 'code' ? sortConfig.direction : null
              }
            >
              Subject Code
            </SortableTableHead>
            <SortableTableHead
              onSort={() => handleSort('name')}
              sortDirection={
                sortConfig?.key === 'name' ? sortConfig.direction : null
              }
            >
              Subject Name
            </SortableTableHead>
            <SortableTableHead
              onSort={() => handleSort('field_of_education')}
              sortDirection={
                sortConfig?.key === 'field_of_education'
                  ? sortConfig.direction
                  : null
              }
            >
              Field of Education
            </SortableTableHead>
            <SortableTableHead
              onSort={() => handleSort('nominal_hours')}
              sortDirection={
                sortConfig?.key === 'nominal_hours'
                  ? sortConfig.direction
                  : null
              }
            >
              Nominal Hours
            </SortableTableHead>
            <SortableTableHead
              onSort={() => handleSort('vet_flag')}
              sortDirection={
                sortConfig?.key === 'vet_flag' ? sortConfig.direction : null
              }
            >
              VET Flag
            </SortableTableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y">
          {rows.map((s) => (
            <TableRow key={s.id} className="divide-x">
              <TableCell>{s.code}</TableCell>
              <TableCell>{s.name}</TableCell>
              <TableCell>{s.field_of_education_id ?? '—'}</TableCell>
              <TableCell>{s.nominal_hours ?? '—'}</TableCell>
              <TableCell>{s.vet_flag ?? '—'}</TableCell>
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
                      <Link href={`/subjects/edit/${s.id}`}>Edit</Link>
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
                          <AlertDialogTitle>Delete Subject</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete the subject. This
                            action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={async () => {
                              try {
                                await deleteMutation.mutateAsync(
                                  s.id as string
                                );
                                toast.success('Subject deleted');
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
              <TableCell colSpan={6}>
                <p className="text-muted-foreground text-sm">
                  No subjects found.
                </p>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
