'use client';

import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle } from 'lucide-react';

interface Alternative {
  id: string;
  name: string;
  current_enrollment_count: number;
  max_capacity: number;
  availableSpots: number;
}

interface GroupCapacityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentGroupName: string;
  currentCount: number;
  maxCapacity: number;
  alternatives: Alternative[];
  onConfirm: (newGroupId: string) => Promise<void>;
  isConfirming?: boolean;
}

export const GroupCapacityDialog = ({
  open,
  onOpenChange,
  currentGroupName,
  currentCount,
  maxCapacity,
  alternatives,
  onConfirm,
  isConfirming = false,
}: GroupCapacityDialogProps) => {
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');

  const handleConfirm = async () => {
    if (!selectedGroupId) return;
    await onConfirm(selectedGroupId);
    setSelectedGroupId(''); // Reset selection after confirm
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertCircle className="text-destructive h-5 w-5" />
            Group at Full Capacity
          </AlertDialogTitle>
          <AlertDialogDescription>
            <strong>{currentGroupName}</strong> is now full (
            <span className="font-semibold">
              {currentCount}/{maxCapacity}
            </span>
            ).
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-4">
          {alternatives.length > 0 ? (
            <>
              <p className="text-muted-foreground text-sm">
                Please select an alternative group with available capacity to
                continue with the approval:
              </p>
              <div className="space-y-2">
                <Select
                  value={selectedGroupId}
                  onValueChange={setSelectedGroupId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an alternative group" />
                  </SelectTrigger>
                  <SelectContent>
                    {alternatives.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        <div className="flex w-full items-center justify-between gap-3">
                          <span>{group.name}</span>
                          <Badge variant="secondary" className="ml-auto">
                            {group.current_enrollment_count}/
                            {group.max_capacity}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : (
            <p className="text-destructive text-sm">
              No alternative groups with available capacity found at this
              location. Please create a new group or increase capacity before
              approving this application.
            </p>
          )}
        </div>
        <AlertDialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isConfirming}
          >
            Cancel
          </Button>
          {alternatives.length > 0 && (
            <Button
              onClick={handleConfirm}
              disabled={!selectedGroupId || isConfirming}
            >
              {isConfirming ? 'Approving...' : 'Approve with Selected Group'}
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
