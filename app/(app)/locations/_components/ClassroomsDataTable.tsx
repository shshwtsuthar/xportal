'use client';

import { useMemo, useState } from 'react';
import { useGetClassrooms } from '@/src/hooks/useGetClassrooms';
import { useCreateClassroom } from '@/src/hooks/useCreateClassroom';
import { useDeleteClassroom } from '@/src/hooks/useDeleteClassroom';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Form } from '@/components/ui/form';
import { CardFooter } from '@/components/ui/card';
import { Plus, MoreHorizontal, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  classroomSchema,
  type ClassroomFormValues,
} from '@/lib/validators/classroom';
import { ClassroomForm } from './ClassroomForm';
import { toast } from 'sonner';

type Props = {
  locationId: string;
};

const typeLabels: Record<string, string> = {
  CLASSROOM: 'Classroom',
  COMPUTER_LAB: 'Computer Lab',
  WORKSHOP: 'Workshop',
  KITCHEN: 'Kitchen',
  MEETING_ROOM: 'Meeting Room',
  OTHER: 'Other',
};

const statusLabels: Record<string, string> = {
  AVAILABLE: 'Available',
  MAINTENANCE: 'Under Maintenance',
  DECOMMISSIONED: 'Decommissioned',
};

export function ClassroomsDataTable({ locationId }: Props) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { data, isLoading, isError } = useGetClassrooms(locationId);
  const createMutation = useCreateClassroom();
  const deleteMutation = useDeleteClassroom();

  const rows = useMemo(() => data ?? [], [data]);

  const form = useForm<ClassroomFormValues>({
    resolver: zodResolver(classroomSchema),
    defaultValues: {
      name: '',
      type: 'CLASSROOM',
      capacity: 0,
      status: 'AVAILABLE',
      description: '',
    },
  });

  const handleSubmit = async (values: ClassroomFormValues) => {
    try {
      await createMutation.mutateAsync({
        ...values,
        location_id: locationId,
      });
      toast.success('Classroom created');
      setIsDialogOpen(false);
      form.reset();
    } catch (e) {
      toast.error(String((e as Error).message || e));
    }
  };

  if (isLoading)
    return <p className="text-muted-foreground text-sm">Loading classrooms…</p>;
  if (isError)
    return (
      <p className="text-destructive text-sm">Failed to load classrooms.</p>
    );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Classrooms</h3>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Classroom
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>New Classroom</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(handleSubmit)}
                className="space-y-4"
              >
                <ClassroomForm form={form} />
                <div className="flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending
                      ? 'Creating…'
                      : 'Create Classroom'}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="w-full overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="divide-x">
              <TableHead>Classroom Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Capacity</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y">
            {rows.map((classroom) => (
              <TableRow key={classroom.id} className="divide-x">
                <TableCell>{classroom.name}</TableCell>
                <TableCell>
                  {typeLabels[classroom.type] || classroom.type}
                </TableCell>
                <TableCell>{classroom.capacity}</TableCell>
                <TableCell>
                  {statusLabels[classroom.status] || classroom.status}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        aria-label="Row actions"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem disabled>Edit</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem
                            variant="destructive"
                            onSelect={(e) => e.preventDefault()}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Delete Classroom
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete the classroom. This
                              action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={async () => {
                                try {
                                  await deleteMutation.mutateAsync(
                                    classroom.id as string
                                  );
                                  toast.success('Classroom deleted');
                                } catch (e) {
                                  toast.error(
                                    String((e as Error).message || e)
                                  );
                                }
                              }}
                              className="bg-destructive hover:bg-destructive/90 text-white"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow className="divide-x">
                <TableCell colSpan={5}>
                  <p className="text-muted-foreground text-sm">
                    No classrooms found.
                  </p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
