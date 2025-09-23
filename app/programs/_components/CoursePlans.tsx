"use client";

import { useState, useMemo } from "react";
import { useCoursePlans, useCreateCoursePlan, usePlanSubjects, useReplacePlanSubjects, type PlanSubjectItem } from "@/hooks/use-course-plans";
import { useProgramSubjects } from "@/hooks/use-programs";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";

// No token needed - handled by hooks

type Props = { programId: string };

export const CoursePlans = ({ programId }: Props) => {
  const { data: plans } = useCoursePlans(programId);
  const createPlan = useCreateCoursePlan();
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const { data: planSubjects } = usePlanSubjects(programId, selectedPlanId);
  const { data: subjects } = useProgramSubjects(programId);
  const replacePlanSubjects = useReplacePlanSubjects();

  const grouped = useMemo(() => {
    const core = (subjects?.data ?? []).filter(s => s.isCore);
    const electives = (subjects?.data ?? []).filter(s => !s.isCore);
    const selected = new Set((planSubjects ?? []).map(s => s.subject_id));
    return { core, electives, selected };
  }, [subjects, planSubjects]);

  const [planName, setPlanName] = useState<string>("");
  const [planVersion, setPlanVersion] = useState<number>(1);
  const [open, setOpen] = useState(false);

  const PlanSchema = z.object({ name: z.string().min(1), version: z.number().int().positive() });
  const form = useForm<z.infer<typeof PlanSchema>>({ resolver: zodResolver(PlanSchema), defaultValues: { name: "", version: 1 } });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>Create plan</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create course plan</DialogTitle>
            </DialogHeader>
            <form
              className="space-y-3"
              onSubmit={form.handleSubmit((values) => {
                if (!programId) return;
                createPlan.mutate(
                  { programId, name: values.name.trim(), version: values.version },
                  { onSuccess: () => { toast.success('Plan created'); setOpen(false); form.reset({ name: '', version: 1 }); }, onError: () => toast.error('Failed to create plan') }
                );
              })}
            >
              <input className="w-full border rounded px-3 py-2 text-sm" placeholder="Plan name" {...form.register('name')} />
              <input className="w-28 border rounded px-3 py-2 text-sm" placeholder="1" type="number" {...form.register('version', { valueAsNumber: true })} />
              <DialogFooter>
                <button type="submit" className="px-3 py-2 rounded bg-primary text-primary-foreground">Create</button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-1 border rounded p-3">
          <h3 className="font-medium mb-2">Plans</h3>
          {!plans && <div className="space-y-2">{Array.from({length:3}).map((_,i)=>(<div key={i} className="h-8 bg-muted rounded animate-pulse" />))}</div>}
          {plans?.length===0 && <p className="text-sm text-muted-foreground">No plans. Create one.</p>}
          {!!plans && plans.length>0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map(pl => (
                  <TableRow key={pl.id} className={selectedPlanId===pl.id?"bg-muted/50":""}>
                    <TableCell>{pl.name}</TableCell>
                    <TableCell>v{pl.version}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 text-xs rounded ${pl.is_active?"bg-green-600/20 text-green-400":"bg-zinc-700 text-zinc-300"}`}>{pl.is_active?"Active":"Draft"}</span>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <button className="px-2 py-1 rounded border" onClick={() => setSelectedPlanId(pl.id)}>Edit subjects</button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <div className="col-span-2 border rounded p-3">
          <h3 className="font-medium mb-2">Subjects</h3>
          {!selectedPlanId && <p className="text-sm text-muted-foreground">Select a plan to manage subjects.</p>}
          {!!selectedPlanId && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">Core</h4>
                  <div className="text-xs text-muted-foreground">{(planSubjects??[]).filter(i=>grouped.core.some(s=>s.id===i.subject_id)).length} selected</div>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <Button variant="outline" size="sm" onClick={() => {
                    const all: PlanSubjectItem[] = [
                      ...(planSubjects??[]).filter(i=>i.unit_type==='Elective'),
                      ...grouped.core.map((s, idx) => ({ subject_id: s.id, unit_type: 'Core' as const, sort_order: idx+1 })),
                    ];
                    replacePlanSubjects.mutate({ programId, planId: selectedPlanId, items: Array.from(new Map(all.map(i => [i.subject_id, i])).values()) }, { onSuccess: () => toast.success('Core selected'), onError: () => toast.error('Failed') });
                  }}>Select all</Button>
                  <Button variant="outline" size="sm" onClick={() => {
                    const remaining: PlanSubjectItem[] = (planSubjects??[]).filter(i=>!grouped.core.some(s=>s.id===i.subject_id));
                    replacePlanSubjects.mutate({ programId, planId: selectedPlanId, items: remaining }, { onSuccess: () => toast.success('Core cleared'), onError: () => toast.error('Failed') });
                  }}>Clear</Button>
                </div>
                <ul className="space-y-1 max-h-64 overflow-auto border rounded p-2">
                  {grouped.core.map(s => {
                    const checked = (planSubjects??[]).some(i=>i.subject_id===s.id);
                    return (
                      <li key={s.id}>
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            className="w-4 h-4"
                            checked={checked}
                            onChange={(e) => {
                              const next: PlanSubjectItem[] = [...(planSubjects ?? [])];
                              if (e.target.checked) next.push({ subject_id: s.id, unit_type: 'Core', sort_order: next.length + 1 });
                              else {
                                const idx = next.findIndex(i => i.subject_id === s.id);
                                if (idx >= 0) next.splice(idx, 1);
                              }
                              replacePlanSubjects.mutate({ programId, planId: selectedPlanId, items: Array.from(new Map(next.map(i => [i.subject_id, i])).values()) }, { onSuccess: () => toast.success('Subjects updated'), onError: () => toast.error('Failed') });
                            }}
                          />
                          {s.code} - {s.name}
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">Electives</h4>
                  <div className="text-xs text-muted-foreground">{(planSubjects??[]).filter(i=>grouped.electives.some(s=>s.id===i.subject_id)).length} selected</div>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <Button variant="outline" size="sm" onClick={() => {
                    const all: PlanSubjectItem[] = [
                      ...(planSubjects??[]).filter(i=>i.unit_type==='Core'),
                      ...grouped.electives.map((s, idx) => ({ subject_id: s.id, unit_type: 'Elective' as const, sort_order: idx+1 })),
                    ];
                    replacePlanSubjects.mutate({ programId, planId: selectedPlanId, items: Array.from(new Map(all.map(i => [i.subject_id, i])).values()) }, { onSuccess: () => toast.success('Electives selected'), onError: () => toast.error('Failed') });
                  }}>Select all</Button>
                  <Button variant="outline" size="sm" onClick={() => {
                    const remaining: PlanSubjectItem[] = (planSubjects??[]).filter(i=>!grouped.electives.some(s=>s.id===i.subject_id));
                    replacePlanSubjects.mutate({ programId, planId: selectedPlanId, items: remaining }, { onSuccess: () => toast.success('Electives cleared'), onError: () => toast.error('Failed') });
                  }}>Clear</Button>
                </div>
                <ul className="space-y-1 max-h-64 overflow-auto border rounded p-2">
                  {grouped.electives.map(s => {
                    const checked = (planSubjects??[]).some(i=>i.subject_id===s.id);
                    return (
                      <li key={s.id}>
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            className="w-4 h-4"
                            checked={checked}
                            onChange={(e) => {
                              const next: PlanSubjectItem[] = [...(planSubjects ?? [])];
                              if (e.target.checked) next.push({ subject_id: s.id, unit_type: 'Elective', sort_order: next.length + 1 });
                              else {
                                const idx = next.findIndex(i => i.subject_id === s.id);
                                if (idx >= 0) next.splice(idx, 1);
                              }
                              replacePlanSubjects.mutate({ programId, planId: selectedPlanId, items: Array.from(new Map(next.map(i => [i.subject_id, i])).values()) }, { onSuccess: () => toast.success('Subjects updated'), onError: () => toast.error('Failed') });
                            }}
                          />
                          {s.code} - {s.name}
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


