'use client';

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
import { useRouter } from 'next/navigation';
import { useGetProgramPlans } from '@/src/hooks/useGetProgramPlans';
import { useGetPrograms } from '@/src/hooks/useGetPrograms';
import { useDeleteProgramPlan } from '@/src/hooks/useDeleteProgramPlan';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useMemo } from 'react';

export default function ProgramPlansPage() {
  const router = useRouter();
  const { data: plans = [], isLoading: plansLoading } = useGetProgramPlans();
  const { data: programs = [], isLoading: programsLoading } = useGetPrograms();
  const del = useDeleteProgramPlan();

  const programMap = useMemo(() => {
    const map = new Map<string, string>();
    programs.forEach((p) => map.set(p.id as string, p.name as string));
    return map;
  }, [programs]);

  const isLoading = plansLoading || programsLoading;

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Program Plans
          </h1>
          <p className="text-muted-foreground text-sm">
            Reusable academic schedules per program
          </p>
        </div>
        <Button onClick={() => router.push('/program-plans/new')}>
          <Plus className="mr-2 h-4 w-4" /> Create New Program Plan
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold tracking-tight">
            All Plans
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="divide-x">
                  <TableHead>Name</TableHead>
                  <TableHead>Program</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y">
                {isLoading ? (
                  <TableRow className="divide-x">
                    <TableCell colSpan={3}>
                      <p className="text-muted-foreground text-sm">
                        Loading plans…
                      </p>
                    </TableCell>
                  </TableRow>
                ) : plans.length === 0 ? (
                  <TableRow className="divide-x">
                    <TableCell colSpan={3}>
                      <p className="text-muted-foreground text-sm">
                        No plans found
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  plans.map((pl) => (
                    <TableRow key={pl.id as string} className="divide-x">
                      <TableCell>{pl.name}</TableCell>
                      <TableCell>
                        {programMap.get(pl.program_id as string) ?? '—'}
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
                            <DropdownMenuItem
                              onClick={() =>
                                router.push(`/program-plans/edit/${pl.id}`)
                              }
                            >
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={async () => {
                                try {
                                  await del.mutateAsync(pl.id as string);
                                  toast.success('Plan deleted');
                                } catch (e) {
                                  toast.error(
                                    String((e as Error).message || e)
                                  );
                                }
                              }}
                            >
                              Delete
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
    </div>
  );
}
