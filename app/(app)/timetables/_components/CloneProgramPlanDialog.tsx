'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useCloneProgramPlan } from '@/src/hooks/useCloneProgramPlan';
import { useGetProgramPlans } from '@/src/hooks/useGetProgramPlans';

type CloneProgramPlanDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  timetableId: string;
  programId: string;
};

export function CloneProgramPlanDialog({
  isOpen,
  onClose,
  timetableId,
  programId,
}: CloneProgramPlanDialogProps) {
  const [newName, setNewName] = useState('');
  const [sourcePlanId, setSourcePlanId] = useState('');

  const cloneProgramPlan = useCloneProgramPlan();
  const { data: availablePlans = [], isLoading: plansLoading } =
    useGetProgramPlans(programId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newName.trim()) {
      toast.error('Please enter a name for the new program plan');
      return;
    }

    if (!sourcePlanId) {
      toast.error('Please select a source program plan');
      return;
    }

    try {
      await cloneProgramPlan.mutateAsync({
        sourceProgramPlanId: sourcePlanId,
        newName: newName.trim(),
        timetableId,
      });

      toast.success('Program plan cloned successfully');
      setNewName('');
      setSourcePlanId('');
      onClose();
    } catch (e) {
      toast.error(String((e as Error).message || e));
    }
  };

  const handleClose = () => {
    setNewName('');
    setSourcePlanId('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Clone Program Plan</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sourcePlan">Source Program Plan *</Label>
            <Select
              value={sourcePlanId}
              onValueChange={setSourcePlanId}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a program plan to clone" />
              </SelectTrigger>
              <SelectContent>
                {plansLoading ? (
                  <div className="text-muted-foreground px-2 py-1.5 text-sm">
                    Loading program plans...
                  </div>
                ) : (
                  availablePlans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id as string}>
                      {plan.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="newName">New Program Plan Name *</Label>
            <Input
              id="newName"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g., 2026 Intake"
              required
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={cloneProgramPlan.isPending}>
              {cloneProgramPlan.isPending ? 'Cloning...' : 'Clone Plan'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
