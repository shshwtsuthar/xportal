'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useGetPrograms } from '@/src/hooks/useGetPrograms';
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
import { useGetProgramLevels } from '@/src/hooks/useGetProgramLevels';
import { useDeleteProgram } from '@/src/hooks/useDeleteProgram';
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

export function ProgramsDataTable() {
  const { data, isLoading, isError } = useGetPrograms();
  const { data: levels } = useGetProgramLevels();
  const deleteMutation = useDeleteProgram();
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
        case 'level':
          aVal = a.level_of_education_id || '';
          bVal = b.level_of_education_id || '';
          break;
        case 'nominal_hours':
          aVal = a.nominal_hours || 0;
          bVal = b.nominal_hours || 0;
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortConfig]);
  const levelMap = useMemo(() => {
    const map = new Map<string, string>();
    (levels ?? []).forEach((l) => map.set(l.id as string, l.label as string));
    return map;
  }, [levels]);

  if (isLoading)
    return <p className="text-muted-foreground text-sm">Loading programs…</p>;
  if (isError)
    return <p className="text-destructive text-sm">Failed to load programs.</p>;

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
              Program Code
            </SortableTableHead>
            <SortableTableHead
              onSort={() => handleSort('name')}
              sortDirection={
                sortConfig?.key === 'name' ? sortConfig.direction : null
              }
            >
              Program Name
            </SortableTableHead>
            <SortableTableHead
              onSort={() => handleSort('level')}
              sortDirection={
                sortConfig?.key === 'level' ? sortConfig.direction : null
              }
            >
              AQF Level
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
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y">
          {rows.map((p) => (
            <TableRow key={p.id} className="divide-x">
              <TableCell>{p.code}</TableCell>
              <TableCell>{p.name}</TableCell>
              <TableCell>
                {p.level_of_education_id
                  ? (levelMap.get(
                      p.level_of_education_id as unknown as string
                    ) ?? p.level_of_education_id)
                  : '—'}
              </TableCell>
              <TableCell>{p.nominal_hours ?? '—'}</TableCell>
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
                      <Link href={`/programs/edit/${p.id}`}>Edit</Link>
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
                          <AlertDialogTitle>Delete Program</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete the program. This
                            action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={async () => {
                              try {
                                await deleteMutation.mutateAsync(
                                  p.id as string
                                );
                                toast.success('Program deleted');
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
                  No programs found.
                </p>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
