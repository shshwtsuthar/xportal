'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CalendarDays } from 'lucide-react';
import { toast } from 'sonner';

type DateDisplacementDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDisplace: (days: number) => void;
  totalSubjects: number;
};

export function DateDisplacementDialog({
  open,
  onOpenChange,
  onDisplace,
  totalSubjects,
}: DateDisplacementDialogProps) {
  const [days, setDays] = useState<number>(0);

  const handleApply = () => {
    if (days === 0) {
      toast.error('Please enter a non-zero number of days');
      return;
    }

    onDisplace(days);
    setDays(0);
    onOpenChange(false);
  };

  const handleCancel = () => {
    setDays(0);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Displace Dates
          </DialogTitle>
          <DialogDescription>
            Enter the number of days to displace all start and end dates by. Use
            negative numbers to move dates backward.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="days">Days to displace</Label>
            <Input
              id="days"
              type="number"
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value) || 0)}
              placeholder="e.g. 1, -3, 7"
              className="w-full"
            />
            <p className="text-muted-foreground text-sm">
              This will affect {totalSubjects} subject
              {totalSubjects !== 1 ? 's' : ''} in the plan.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleApply}>Apply Displacement</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
