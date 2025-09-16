'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// =============================================================================
// UNSAVED CHANGES DIALOG COMPONENT
// Dialog warning users about unsaved changes when navigating away
// Follows ShadCN design system and accessibility guidelines
// =============================================================================

interface UnsavedChangesDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog should be closed */
  onOpenChange: (open: boolean) => void;
  /** Callback when user confirms they want to leave without saving */
  onConfirmLeave: () => void;
  /** Callback when user cancels and wants to stay */
  onCancel: () => void;
}

export const UnsavedChangesDialog = ({
  open,
  onOpenChange,
  onConfirmLeave,
  onCancel,
}: UnsavedChangesDialogProps) => {
  const handleConfirmLeave = () => {
    onConfirmLeave();
    onOpenChange(false);
  };

  const handleCancel = () => {
    onCancel();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
          <AlertDialogDescription>
            You have unsaved changes to your application. If you leave now, 
            your changes will be lost. Are you sure you want to continue?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>
            Stay and Save
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleConfirmLeave}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Leave Without Saving
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
