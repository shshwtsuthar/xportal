'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useGetPrograms } from '@/src/hooks/useGetPrograms';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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

  const rows = useMemo(() => data ?? [], [data]);
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
            <TableHead>Program Code</TableHead>
            <TableHead>Program Name</TableHead>
            <TableHead>AQF Level</TableHead>
            <TableHead>Nominal Hours</TableHead>
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
