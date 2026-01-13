'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Settings } from 'lucide-react';
import { RemindersDataTable } from './_components/RemindersDataTable';
import { SetIssueDateDialog } from './_components/SetIssueDateDialog';
import { NewReminderDialog } from './_components/NewReminderDialog';
import { useGetPaymentPlanReminders } from '@/src/hooks/useGetPaymentPlanReminders';
import { useDeletePaymentPlanReminder } from '@/src/hooks/useDeletePaymentPlanReminder';
import type { PaymentPlanReminderWithRelations } from '@/src/hooks/useGetPaymentPlanReminders';
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

export default function RemindersPage() {
  const { data: reminders, isLoading } = useGetPaymentPlanReminders();
  const deleteReminder = useDeletePaymentPlanReminder();

  const [isIssueDateDialogOpen, setIsIssueDateDialogOpen] =
    React.useState(false);
  const [isNewReminderDialogOpen, setIsNewReminderDialogOpen] =
    React.useState(false);
  const [editingReminder, setEditingReminder] =
    React.useState<PaymentPlanReminderWithRelations | null>(null);
  const [reminderToDelete, setReminderToDelete] = React.useState<string | null>(
    null
  );

  const handleEdit = (reminder: PaymentPlanReminderWithRelations) => {
    setEditingReminder(reminder);
    setIsNewReminderDialogOpen(true);
  };

  const handleDelete = (reminderId: string) => {
    setReminderToDelete(reminderId);
  };

  const confirmDelete = async () => {
    if (reminderToDelete) {
      await deleteReminder.mutateAsync(reminderToDelete);
      setReminderToDelete(null);
    }
  };

  const handleDialogClose = (open: boolean) => {
    setIsNewReminderDialogOpen(open);
    if (!open) {
      setEditingReminder(null);
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-semibold tracking-tight">
              Payment Reminders
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setIsIssueDateDialogOpen(true)}
              >
                <Settings className="mr-2 h-4 w-4" />
                Set Issue Date
              </Button>
              <Button onClick={() => setIsNewReminderDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                New Reminder
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-muted-foreground py-8 text-center">
              Loading reminders...
            </div>
          ) : (
            <RemindersDataTable
              data={reminders ?? []}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          )}
        </CardContent>
      </Card>

      {/* Set Issue Date Dialog */}
      <SetIssueDateDialog
        open={isIssueDateDialogOpen}
        onOpenChange={setIsIssueDateDialogOpen}
      />

      {/* New/Edit Reminder Dialog */}
      <NewReminderDialog
        open={isNewReminderDialogOpen}
        onOpenChange={handleDialogClose}
        editingReminder={editingReminder}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={reminderToDelete !== null}
        onOpenChange={(open) => !open && setReminderToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this reminder. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
