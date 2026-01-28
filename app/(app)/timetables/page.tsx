'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useGetTimetables } from '@/src/hooks/useGetTimetables';
import { useGetPrograms } from '@/src/hooks/useGetPrograms';
import { useDeleteTimetable } from '@/src/hooks/useDeleteTimetable';
import { useMemo } from 'react';
import { PageContainer } from '@/components/page-container';

export default function TimetablesPage() {
  const { data: timetables = [], isLoading: timetablesLoading } =
    useGetTimetables();
  const { data: programs = [], isLoading: programsLoading } = useGetPrograms();
  const deleteTimetable = useDeleteTimetable();

  const programMap = useMemo(() => {
    const map = new Map<string, string>();
    programs.forEach((p) => map.set(p.id as string, p.name as string));
    return map;
  }, [programs]);

  const isLoading = timetablesLoading || programsLoading;

  return (
    <PageContainer
      title="Timetables"
      description="Manage academic schedules and program plan cycles"
      actions={
        <Button asChild>
          <Link href="/timetables/new">
            <Plus className="mr-2 h-4 w-4" />
            New Timetable
          </Link>
        </Button>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold tracking-tight">
            All Timetables
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="divide-x">
                  <TableHead>Name</TableHead>
                  <TableHead>Program</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y">
                {isLoading ? (
                  <TableRow className="divide-x">
                    <TableCell colSpan={4}>
                      <p className="text-muted-foreground text-sm">
                        Loading timetables…
                      </p>
                    </TableCell>
                  </TableRow>
                ) : timetables.length === 0 ? (
                  <TableRow className="divide-x">
                    <TableCell colSpan={4}>
                      <p className="text-muted-foreground text-sm">
                        No timetables found
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  timetables.map((timetable) => (
                    <TableRow key={timetable.id as string} className="divide-x">
                      <TableCell>{timetable.name}</TableCell>
                      <TableCell>
                        {programMap.get(timetable.program_id as string) ?? '—'}
                      </TableCell>
                      <TableCell>
                        {new Date(timetable.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Actions"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/timetables/${timetable.id}`}>
                                View Details
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={async () => {
                                try {
                                  await deleteTimetable.mutateAsync(
                                    timetable.id as string
                                  );
                                  toast.success('Timetable archived');
                                } catch (e) {
                                  toast.error(
                                    String((e as Error).message || e)
                                  );
                                }
                              }}
                            >
                              Archive
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
