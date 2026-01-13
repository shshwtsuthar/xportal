'use client';

import * as React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Pencil, Trash2, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { PaymentPlanReminderWithRelations } from '@/src/hooks/useGetPaymentPlanReminders';

type RemindersDataTableProps = {
  data: PaymentPlanReminderWithRelations[];
  onEdit: (reminder: PaymentPlanReminderWithRelations) => void;
  onDelete: (reminderId: string) => void;
};

export function RemindersDataTable({
  data,
  onEdit,
  onDelete,
}: RemindersDataTableProps) {
  const getOffsetDisplay = (offset: number) => {
    if (offset < 0) {
      return `${Math.abs(offset)} days before`;
    } else if (offset > 0) {
      return `${offset} days after`;
    }
    return 'On due date';
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Payment Plan Template</TableHead>
            <TableHead>Reminder Name</TableHead>
            <TableHead>Offset</TableHead>
            <TableHead>Mail Template</TableHead>
            <TableHead>Regenerate Invoice</TableHead>
            <TableHead className="w-[70px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length > 0 ? (
            data.map((reminder) => (
              <TableRow key={reminder.id}>
                <TableCell className="font-medium">
                  {reminder.payment_plan_templates?.name || '—'}
                </TableCell>
                <TableCell>{reminder.name}</TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {getOffsetDisplay(reminder.offset_days)}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">
                  {reminder.mail_templates?.name || '—'}
                </TableCell>
                <TableCell>
                  {reminder.regenerate_invoice ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(reminder)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onDelete(reminder.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center">
                No reminders configured yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
