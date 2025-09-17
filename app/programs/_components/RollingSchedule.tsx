"use client";

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDeriveCatchup, useProgramRollingSchedule, useSchedulePreview, useUpsertProgramRollingSchedule, useValidateProgramRollingSchedule, type ProgramScheduleUpsert } from '@/hooks/use-rolling-schedule';
import { useProgramSubjects } from '@/hooks/use-programs';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

type UnitDraft = { subjectId: string; orderIndex: number; durationDays: number };

export const RollingSchedule = ({ programId }: { programId: string }) => {
  const { data: schedule, isLoading: scheduleLoading } = useProgramRollingSchedule(programId);
  const { data: subjectsResp, isLoading: subjectsLoading } = useProgramSubjects(programId);
  const validateMutation = useValidateProgramRollingSchedule();
  const upsertMutation = useUpsertProgramRollingSchedule();
  const previewMutation = useSchedulePreview();
  const deriveCatchupMutation = useDeriveCatchup();

  const subjects = useMemo(() => subjectsResp?.data ?? [], [subjectsResp]);

  const [name, setName] = useState<string>('Default Rolling Schedule');
  const [anchorDate, setAnchorDate] = useState<string>('');
  const [timezone] = useState<string>('Australia/Melbourne');
  const [units, setUnits] = useState<UnitDraft[]>([]);
  const [cycles, setCycles] = useState<number>(2);

  useEffect(() => {
    if (schedule) {
      setName(schedule.name ?? 'Default Rolling Schedule');
      setAnchorDate(schedule.cycle_anchor_date ?? '');
      setUnits(
        (schedule.units ?? [])
          .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
          .map((u) => ({ subjectId: u.subject_id, orderIndex: u.order_index, durationDays: u.duration_days }))
      );
    }
  }, [schedule]);

  const handleAddUnit = () => {
    const firstSubject = subjects[0];
    if (!firstSubject) return;
    const nextOrder = units.length > 0 ? Math.max(...units.map(u => u.orderIndex)) + 1 : 0;
    setUnits((prev) => [...prev, { subjectId: firstSubject.id, orderIndex: nextOrder, durationDays: 14 }]);
  };

  const handleRemoveUnit = (idx: number) => {
    setUnits((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleChangeUnit = (idx: number, patch: Partial<UnitDraft>) => {
    setUnits((prev) => prev.map((u, i) => (i === idx ? { ...u, ...patch } : u)));
  };

  const handleValidate = async () => {
    const payload: ProgramScheduleUpsert = { name, cycleAnchorDate: anchorDate, timezone, units };
    return validateMutation.mutateAsync({ programId, data: payload });
  };

  const handleSave = async () => {
    const payload: ProgramScheduleUpsert = { name, cycleAnchorDate: anchorDate, timezone, units };
    await upsertMutation.mutateAsync({ programId, data: payload });
  };

  const handlePreview = async () => {
    await previewMutation.mutateAsync({ programId, cycles });
  };

  const isBusy = validateMutation.isPending || upsertMutation.isPending || previewMutation.isPending;

  if (scheduleLoading || subjectsLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-80" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Rolling Schedule</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="schedule-name">Name</Label>
              <Input id="schedule-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Default Rolling Schedule" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="anchor-date">Anchor Date</Label>
              <Input id="anchor-date" type="date" value={anchorDate} onChange={(e) => setAnchorDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Timezone</Label>
              <Input value={timezone} readOnly />
            </div>
          </div>

          <Separator className="my-2" />

          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground">Units in Cycle</h3>
            <Button onClick={handleAddUnit} disabled={subjects.length === 0} aria-label="Add unit row">Add Unit</Button>
          </div>

          <div className="space-y-3">
            {units.length === 0 ? (
              <div className="text-sm text-muted-foreground">No units yet. Click "Add Unit" to begin.</div>
            ) : (
              units.map((u, idx) => (
                <div key={`${u.subjectId}-${idx}`} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  <div className="md:col-span-6 space-y-2">
                    <Label>Subject</Label>
                    <Select value={u.subjectId} onValueChange={(v) => handleChangeUnit(idx, { subjectId: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select subject" />
                      </SelectTrigger>
                      <SelectContent>
                        {subjects.map((s: any) => (
                          <SelectItem key={s.subject_id ?? s.id} value={s.subject_id ?? s.id}>
                            {(s.subject_identifier ?? s.code) + ' - ' + (s.subject_name ?? s.name)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <Label>Order</Label>
                    <Input type="number" min={0} value={u.orderIndex} onChange={(e) => handleChangeUnit(idx, { orderIndex: Number(e.target.value) })} />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <Label>Duration (days)</Label>
                    <Input type="number" min={1} value={u.durationDays} onChange={(e) => handleChangeUnit(idx, { durationDays: Number(e.target.value) })} />
                  </div>
                  <div className="md:col-span-2 flex gap-2">
                    <Button variant="secondary" onClick={() => handleRemoveUnit(idx)} aria-label="Remove unit">Remove</Button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <Button onClick={handleValidate} disabled={isBusy || !anchorDate || units.length === 0} aria-label="Validate schedule">Validate</Button>
            <Button onClick={handleSave} disabled={isBusy || !anchorDate || units.length === 0} aria-label="Save schedule">Save</Button>
          </div>

          {validateMutation.data && (
            <div className="text-sm">
              {validateMutation.data.isValid ? (
                <div className="text-green-600">Schedule looks valid.</div>
              ) : (
                <ul className="list-disc pl-5 text-red-600">
                  {validateMutation.data.errors.map((e, i) => (
                    <li key={i}>{e.field}: {e.message}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preview Cycles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2 md:col-span-1">
              <Label>Cycles</Label>
              <Input type="number" min={1} value={cycles} onChange={(e) => setCycles(Number(e.target.value) || 1)} />
            </div>
            <div className="md:col-span-3 flex items-end gap-2">
              <Button onClick={handlePreview} disabled={isBusy || !anchorDate || units.length === 0} aria-label="Preview schedule">Preview</Button>
              <Button variant="secondary" disabled={!schedule || units.length === 0} onClick={() => {
                // demo derive catchup using first unit as start
                const start = units.length > 0 ? units[0].subjectId : '';
                if (start) deriveCatchupMutation.mutate({ programId, startUnitId: start });
              }} aria-label="Derive catchup">Derive Catch-up (demo)</Button>
            </div>
          </div>

          {previewMutation.data && (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">Anchor: {previewMutation.data.cycle_anchor_date} • TZ: {previewMutation.data.timezone}</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {previewMutation.data.windows.map((w, i) => (
                  <div key={i} className="rounded border p-3">
                    <div className="text-xs text-muted-foreground">Term {w.term_index + 1}</div>
                    <div className="font-medium">{w.subject_name}</div>
                    <div className="text-sm">{w.start_date} → {w.end_date}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {deriveCatchupMutation.data && (
            <div className="space-y-2">
              <div className="text-sm font-medium">Catch-up Units (Next Term)</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {deriveCatchupMutation.data.catchupUnits.map((cu, i) => (
                  <div key={i} className="rounded border p-3 text-sm">
                    <div>Subject: {cu.subjectId}</div>
                    <div>Planned: {cu.startDate} → {cu.endDate}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};


