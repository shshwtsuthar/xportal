'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useCreateTimetable } from '@/src/hooks/useCreateTimetable';
import { useGetPrograms } from '@/src/hooks/useGetPrograms';
import { useGetProgramPlans } from '@/src/hooks/useGetProgramPlans';
import { useAddProgramPlansToTimetable } from '@/src/hooks/useAddProgramPlansToTimetable';
import { useGetGroupsByProgram } from '@/src/hooks/useGetGroupsByProgram';
import Link from 'next/link';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function NewTimetablePage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [programId, setProgramId] = useState('');
  const [groupId, setGroupId] = useState('');
  const [selectedProgramPlanIds, setSelectedProgramPlanIds] = useState<
    string[]
  >([]);

  const createTimetable = useCreateTimetable();
  const { data: programs = [], isLoading: programsLoading } = useGetPrograms();
  const { data: groups = [], isLoading: groupsLoading } =
    useGetGroupsByProgram(programId);
  const { data: programPlans = [] } = useGetProgramPlans(programId, groupId);
  const addPlansToTimetable = useAddProgramPlansToTimetable();

  // Reset group and program plans when program changes
  useEffect(() => {
    setGroupId('');
    setSelectedProgramPlanIds([]);
  }, [programId]);

  // Reset program plans when group changes
  useEffect(() => {
    setSelectedProgramPlanIds([]);
  }, [groupId]);

  // Find selected group for capacity display
  const selectedGroup = groups.find((g) => g.id === groupId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Please enter a timetable name');
      return;
    }

    if (!programId) {
      toast.error('Please select a program');
      return;
    }

    if (!groupId) {
      toast.error('Please select a group');
      return;
    }

    if (selectedProgramPlanIds.length === 0) {
      toast.error('Please select at least one program plan');
      return;
    }

    try {
      const newTimetable = await createTimetable.mutateAsync({
        name: name.trim(),
        program_id: programId,
      });

      // Link selected program plans to timetable
      await addPlansToTimetable.mutateAsync({
        timetable_id: newTimetable.id as string,
        program_plan_ids: selectedProgramPlanIds,
      });

      toast.success('Timetable created successfully');
      router.push(`/timetables/${newTimetable.id}`);
    } catch (e) {
      toast.error(String((e as Error).message || e));
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/timetables">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Timetables
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            New Timetable
          </h1>
          <p className="text-muted-foreground text-sm">
            Create a new academic schedule template
          </p>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Create Timetable</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Timetable Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Diploma of Business 2025-2027"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="program">Program *</Label>
              <Select value={programId} onValueChange={setProgramId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select a program" />
                </SelectTrigger>
                <SelectContent>
                  {programsLoading ? (
                    <div className="text-muted-foreground px-2 py-1.5 text-sm">
                      Loading programs...
                    </div>
                  ) : (
                    programs.map((program) => (
                      <SelectItem key={program.id} value={program.id as string}>
                        {program.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="group">Group *</Label>
              <Select
                value={groupId}
                onValueChange={setGroupId}
                disabled={!programId}
                required
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      programId ? 'Select a group' : 'Select a program first'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {groupsLoading ? (
                    <div className="text-muted-foreground px-2 py-1.5 text-sm">
                      Loading groups...
                    </div>
                  ) : groups.length === 0 ? (
                    <div className="text-muted-foreground px-2 py-1.5 text-sm">
                      No groups available for this program
                    </div>
                  ) : (
                    groups.map((group) => (
                      <SelectItem key={group.id} value={group.id as string}>
                        <div className="flex items-center justify-between gap-4">
                          <span>{group.name}</span>
                          <Badge
                            variant={
                              group.current_enrollment_count >=
                              group.max_capacity
                                ? 'destructive'
                                : 'secondary'
                            }
                          >
                            {group.current_enrollment_count}/
                            {group.max_capacity}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {selectedGroup && (
                <p className="text-muted-foreground text-xs">
                  Current enrollment: {selectedGroup.current_enrollment_count} /{' '}
                  {selectedGroup.max_capacity} students
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Program Plans *</Label>
              <p className="text-muted-foreground text-xs">
                Select program plans to include in this timetable (must belong
                to the selected group)
              </p>
              {groupId ? (
                <div className="space-y-2">
                  {programPlans.length === 0 ? (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        No program plans available for this group. Please create
                        program plans for this group first.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="space-y-2 rounded-md border p-4">
                      {programPlans.map((plan) => (
                        <div
                          key={plan.id}
                          className="flex items-center space-x-2"
                        >
                          <input
                            type="checkbox"
                            id={plan.id}
                            checked={selectedProgramPlanIds.includes(
                              plan.id as string
                            )}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedProgramPlanIds([
                                  ...selectedProgramPlanIds,
                                  plan.id as string,
                                ]);
                              } else {
                                setSelectedProgramPlanIds(
                                  selectedProgramPlanIds.filter(
                                    (id) => id !== plan.id
                                  )
                                );
                              }
                            }}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                          <Label
                            htmlFor={plan.id}
                            className="text-sm font-normal"
                          >
                            {plan.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : programId ? (
                <p className="text-muted-foreground text-sm">
                  Select a group to see available program plans
                </p>
              ) : (
                <p className="text-muted-foreground text-sm">
                  Select a program and group first to see available program
                  plans
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={createTimetable.isPending}>
                {createTimetable.isPending ? 'Creating...' : 'Create Timetable'}
              </Button>
              <Button variant="outline" asChild>
                <Link href="/timetables">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
