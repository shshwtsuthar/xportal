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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

type Conflict = {
  class_id: string;
  class_date: string;
  start_time: string;
  end_time: string;
  conflict_reason: string;
  edited_fields?: string[];
};

type ConflictResolutionModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conflicts: Conflict[];
  onResolve: (action: 'preserve' | 'overwrite' | 'cancel') => void;
  isLoading?: boolean;
};

export function ConflictResolutionModal({
  open,
  onOpenChange,
  conflicts,
  onResolve,
  isLoading = false,
}: ConflictResolutionModalProps) {
  const [selectedAction, setSelectedAction] = useState<
    'preserve' | 'overwrite' | 'cancel'
  >('preserve');

  const handleConfirm = () => {
    onResolve(selectedAction);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <DialogTitle>Re-expansion Conflicts Detected</DialogTitle>
          </div>
          <DialogDescription>
            The following classes have been manually edited and conflict with
            template dates. Please choose how to handle these conflicts.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Conflicts List */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Conflicting Classes ({conflicts.length})
            </Label>
            <ScrollArea className="h-[200px] rounded-md border p-4">
              <div className="space-y-3">
                {conflicts.map((conflict) => (
                  <div
                    key={conflict.class_id}
                    className="bg-muted/50 flex items-start justify-between rounded-md p-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">
                          {format(new Date(conflict.class_date), 'PPP')}
                        </p>
                        <Badge variant="outline" className="text-xs">
                          Edited
                        </Badge>
                      </div>
                      <p className="text-muted-foreground text-xs">
                        {conflict.start_time} - {conflict.end_time}
                      </p>
                      {conflict.conflict_reason && (
                        <p className="text-muted-foreground text-xs italic">
                          {conflict.conflict_reason}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Action Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Choose Action</Label>
            <RadioGroup
              value={selectedAction}
              onValueChange={(v) =>
                setSelectedAction(v as 'preserve' | 'overwrite' | 'cancel')
              }
            >
              <div className="space-y-3">
                {/* Preserve edited classes */}
                <div className="hover:bg-muted/50 flex cursor-pointer items-start space-x-3 rounded-lg border p-4">
                  <RadioGroupItem
                    value="preserve"
                    id="preserve"
                    className="mt-1"
                  />
                  <div className="flex-1 space-y-1">
                    <Label
                      htmlFor="preserve"
                      className="cursor-pointer font-medium"
                    >
                      Preserve edited classes, create new instances for
                      remaining dates
                    </Label>
                    <p className="text-muted-foreground text-xs">
                      Recommended. Manually edited classes will be kept
                      unchanged. New classes will be created for dates that
                      don&apos;t conflict with edited classes.
                    </p>
                  </div>
                </div>

                {/* Overwrite all */}
                <div className="border-destructive/50 hover:bg-destructive/5 flex cursor-pointer items-start space-x-3 rounded-lg border p-4">
                  <RadioGroupItem
                    value="overwrite"
                    id="overwrite"
                    className="mt-1"
                  />
                  <div className="flex-1 space-y-1">
                    <Label
                      htmlFor="overwrite"
                      className="text-destructive cursor-pointer font-medium"
                    >
                      Overwrite all classes (lose manual edits)
                    </Label>
                    <p className="text-muted-foreground text-xs">
                      ⚠️ Warning: All manually edited classes will be deleted
                      and replaced with template-generated classes. This action
                      cannot be undone.
                    </p>
                  </div>
                </div>

                {/* Cancel */}
                <div className="hover:bg-muted/50 flex cursor-pointer items-start space-x-3 rounded-lg border p-4">
                  <RadioGroupItem value="cancel" id="cancel" className="mt-1" />
                  <div className="flex-1 space-y-1">
                    <Label
                      htmlFor="cancel"
                      className="cursor-pointer font-medium"
                    >
                      Cancel re-expansion
                    </Label>
                    <p className="text-muted-foreground text-xs">
                      Don&apos;t make any changes. Keep existing classes as they
                      are.
                    </p>
                  </div>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Warning for overwrite */}
          {selectedAction === 'overwrite' && (
            <div className="bg-destructive/10 border-destructive/20 rounded-md border p-3">
              <div className="flex gap-2">
                <AlertTriangle className="text-destructive mt-0.5 h-4 w-4 flex-shrink-0" />
                <div className="space-y-1">
                  <p className="text-destructive text-sm font-medium">
                    You are about to lose {conflicts.length} manually edited
                    class{conflicts.length !== 1 ? 'es' : ''}
                  </p>
                  <p className="text-destructive/80 text-xs">
                    This will permanently delete all manual changes. Consider
                    using &quot;Preserve edited classes&quot; instead.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Close
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading}
            variant={selectedAction === 'overwrite' ? 'destructive' : 'default'}
          >
            {isLoading ? 'Processing...' : 'Confirm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
