'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, MoreHorizontal, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useGetTimetable } from '@/src/hooks/useGetTimetable';
import { useGetPrograms } from '@/src/hooks/useGetPrograms';
import { useGetProgramPlans } from '@/src/hooks/useGetProgramPlans';
import { useDeleteProgramPlan } from '@/src/hooks/useDeleteProgramPlan';
import { useAddProgramPlansToTimetable } from '@/src/hooks/useAddProgramPlansToTimetable';
import { useRemoveProgramPlanFromTimetable } from '@/src/hooks/useRemoveProgramPlanFromTimetable';
import { useGetTimetableGroup } from '@/src/hooks/useGetTimetableGroup';
import { CloneProgramPlanDialog } from '../_components/CloneProgramPlanDialog';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Link from 'next/link';
import { useMemo, use } from 'react';
import { Tables } from '@/database.types';
import { PageContainer } from '@/components/page-container';

type TimetableDetailPageProps = {
  params: Promise<{ id: string }>;
};

// Extended timetable type with nested relations
type TimetableWithPlans = Tables<'timetables'> & {
  timetable_program_plans: Array<{
    id: string;
    program_plan_id: string;
    created_at: string;
    program_plans: Tables<'program_plans'>;
  }>;
};

export default function TimetableDetailPage({
  params,
}: TimetableDetailPageProps) {
  const { id } = use(params);
  const [isCloneDialogOpen, setIsCloneDialogOpen] = useState(false);
  const [isAddPlansDialogOpen, setIsAddPlansDialogOpen] = useState(false);
  const [selectedNewPlanIds, setSelectedNewPlanIds] = useState<string[]>([]);

  const { data: timetable, isLoading: timetableLoading } = useGetTimetable(id);
  const { data: programs = [], isLoading: programsLoading } = useGetPrograms();
  const { data: timetableGroup } = useGetTimetableGroup(id);
  const { data: allProgramPlans = [] } = useGetProgramPlans(
    timetable?.program_id as string
  );
  const deleteProgramPlan = useDeleteProgramPlan();
  const addPlans = useAddProgramPlansToTimetable();
  const removePlan = useRemoveProgramPlanFromTimetable();

  const programMap = useMemo(() => {
    const map = new Map<string, string>();
    programs.forEach((p) => map.set(p.id as string, p.name as string));
    return map;
  }, [programs]);

  // Extract program plans from timetable data via junction table
  const programPlans = useMemo(() => {
    if (!timetable || !('timetable_program_plans' in timetable)) return [];
    const timetableWithPlans = timetable as TimetableWithPlans;
    if (!timetableWithPlans.timetable_program_plans) return [];
    return timetableWithPlans.timetable_program_plans.map((tpp) => ({
      ...tpp.program_plans,
      created_at: tpp.created_at,
    }));
  }, [timetable]);

  // Filter out already-added plans
  const availablePlans = useMemo(() => {
    const addedPlanIds = new Set(programPlans.map((p) => p.id));
    return allProgramPlans.filter((p) => !addedPlanIds.has(p.id));
  }, [allProgramPlans, programPlans]);

  const isLoading = timetableLoading || programsLoading;

  if (isLoading) {
    return (
      <PageContainer title="Loading...">
        <p className="text-muted-foreground text-sm">Loading timetable...</p>
      </PageContainer>
    );
  }

  if (!timetable) {
    return (
      <PageContainer title="Timetable not found">
        <p className="text-muted-foreground text-sm">Timetable not found</p>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/timetables">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Timetables
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {timetable.name}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <p className="text-muted-foreground text-sm">
              Program: {programMap.get(timetable.program_id as string) ?? '—'}
            </p>
            {timetableGroup && (
              <>
                <span className="text-muted-foreground">•</span>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-sm">
                    Group: {timetableGroup.groupName}
                  </span>
                  <Badge
                    variant={
                      timetableGroup.currentEnrollment >=
                      timetableGroup.maxCapacity
                        ? 'destructive'
                        : 'secondary'
                    }
                  >
                    {timetableGroup.currentEnrollment}/
                    {timetableGroup.maxCapacity}
                  </Badge>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {!timetableGroup && programPlans.length > 0 && (
        <Alert className="mb-6">
          <AlertDescription>
            This timetable does not have a group assigned. All program plans in
            a timetable must belong to the same group.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-semibold tracking-tight">
              Program Plans in This Timetable
            </CardTitle>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsCloneDialogOpen(true)}
              >
                Clone from Another Plan
              </Button>
              {availablePlans.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsAddPlansDialogOpen(true)}
                >
                  <Plus className="mr-1 h-3 w-3" />
                  Add Existing Plans
                </Button>
              )}
              <Button size="sm" asChild>
                <Link href="/program-plans/new">
                  <Plus className="mr-1 h-3 w-3" />
                  Create New Program Plan
                </Link>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="w-full overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="divide-x">
                  <TableHead>Name</TableHead>
                  <TableHead>Subjects</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y">
                {isLoading ? (
                  <TableRow className="divide-x">
                    <TableCell colSpan={4}>
                      <p className="text-muted-foreground text-sm">
                        Loading program plans…
                      </p>
                    </TableCell>
                  </TableRow>
                ) : programPlans.length === 0 ? (
                  <TableRow className="divide-x">
                    <TableCell colSpan={4}>
                      <p className="text-muted-foreground text-sm">
                        No program plans found. Create one to get started.
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  programPlans.map((plan) => (
                    <TableRow key={plan.id as string} className="divide-x">
                      <TableCell>{plan.name}</TableCell>
                      <TableCell>
                        {/* TODO: Add subject count when we have the hook */}—
                      </TableCell>
                      <TableCell>
                        {new Date(plan.created_at || '').toLocaleDateString()}
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
                              <Link href={`/program-plans/edit/${plan.id}`}>
                                Edit
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={async () => {
                                try {
                                  await removePlan.mutateAsync({
                                    timetable_id: id,
                                    program_plan_id: plan.id as string,
                                  });
                                  toast.success(
                                    'Program plan removed from timetable'
                                  );
                                } catch (e) {
                                  toast.error(
                                    String((e as Error).message || e)
                                  );
                                }
                              }}
                            >
                              Remove from Timetable
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={async () => {
                                try {
                                  await deleteProgramPlan.mutateAsync(
                                    plan.id as string
                                  );
                                  toast.success('Program plan deleted');
                                } catch (e) {
                                  toast.error(
                                    String((e as Error).message || e)
                                  );
                                }
                              }}
                            >
                              Delete Plan
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

      <CloneProgramPlanDialog
        isOpen={isCloneDialogOpen}
        onClose={() => setIsCloneDialogOpen(false)}
        timetableId={id}
        programId={timetable.program_id as string}
      />

      <Dialog
        open={isAddPlansDialogOpen}
        onOpenChange={setIsAddPlansDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Program Plans to Timetable</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-muted-foreground text-sm">
              Select program plans to add to this timetable
              {timetableGroup &&
                ` (must belong to ${timetableGroup.groupName})`}
              :
            </p>
            {availablePlans.length === 0 ? (
              <Alert>
                <AlertDescription>
                  No additional program plans available for this group. All
                  program plans from this group are already in the timetable.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="max-h-60 space-y-2 overflow-y-auto">
                {availablePlans.map((plan) => (
                  <div key={plan.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={plan.id}
                      checked={selectedNewPlanIds.includes(plan.id as string)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedNewPlanIds([
                            ...selectedNewPlanIds,
                            plan.id as string,
                          ]);
                        } else {
                          setSelectedNewPlanIds(
                            selectedNewPlanIds.filter((id) => id !== plan.id)
                          );
                        }
                      }}
                    />
                    <label htmlFor={plan.id} className="text-sm font-normal">
                      {plan.name}
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddPlansDialogOpen(false);
                setSelectedNewPlanIds([]);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                try {
                  await addPlans.mutateAsync({
                    timetable_id: id,
                    program_plan_ids: selectedNewPlanIds,
                  });
                  toast.success('Program plans added to timetable');
                  setIsAddPlansDialogOpen(false);
                  setSelectedNewPlanIds([]);
                } catch (e) {
                  toast.error(String((e as Error).message || e));
                }
              }}
              disabled={selectedNewPlanIds.length === 0 || addPlans.isPending}
            >
              Add Selected Plans
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
