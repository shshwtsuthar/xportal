'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MoreHorizontal, Plus } from 'lucide-react';
import { useGetGroups } from '@/src/hooks/useGetGroups';
import { useGetPrograms } from '@/src/hooks/useGetPrograms';
import { useGetLocations } from '@/src/hooks/useGetLocations';
import { useCreateGroup } from '@/src/hooks/useCreateGroup';
import { useUpdateGroup } from '@/src/hooks/useUpdateGroup';
import { useDeleteGroup } from '@/src/hooks/useDeleteGroup';
import { useGetMaxClassroomCapacity } from '@/src/hooks/useGetMaxClassroomCapacity';
import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { Tables } from '@/database.types';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { PageContainer } from '@/components/page-container';

export default function GroupsPage() {
  const { data: groups = [], isLoading: groupsLoading } = useGetGroups();
  const { data: programs = [], isLoading: programsLoading } = useGetPrograms();
  const { data: locations = [], isLoading: locationsLoading } =
    useGetLocations();
  const { data: maxClassroomCapacity = 0 } = useGetMaxClassroomCapacity();
  const createGroup = useCreateGroup();
  const updateGroup = useUpdateGroup();
  const deleteGroup = useDeleteGroup();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Tables<'groups'> | null>(
    null
  );
  const [formData, setFormData] = useState({
    program_id: '',
    location_id: '',
    name: '',
    max_capacity: '',
  });

  const programMap = useMemo(() => {
    const map = new Map<string, string>();
    programs.forEach((p) => map.set(p.id as string, p.name as string));
    return map;
  }, [programs]);

  const locationMap = useMemo(() => {
    const map = new Map<string, string>();
    locations.forEach((l) => map.set(l.id as string, l.name as string));
    return map;
  }, [locations]);

  const isLoading = groupsLoading || programsLoading || locationsLoading;

  const handleOpenCreateDialog = () => {
    setEditingGroup(null);
    setFormData({
      program_id: '',
      location_id: '',
      name: '',
      max_capacity: '',
    });
    setIsCreateDialogOpen(true);
  };

  const handleOpenEditDialog = (group: Tables<'groups'>) => {
    setEditingGroup(group);
    setFormData({
      program_id: group.program_id as string,
      location_id: (group.location_id as string) || '',
      name: group.name as string,
      max_capacity: String(group.max_capacity),
    });
    setIsCreateDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsCreateDialogOpen(false);
    setEditingGroup(null);
    setFormData({
      program_id: '',
      location_id: '',
      name: '',
      max_capacity: '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const capacity = parseInt(formData.max_capacity, 10);
    if (isNaN(capacity) || capacity < 1) {
      toast.error('Please enter a valid capacity (minimum 1)');
      return;
    }

    if (capacity > maxClassroomCapacity) {
      toast.error(
        `Capacity exceeds maximum available classroom capacity (${maxClassroomCapacity})`
      );
      return;
    }

    if (!formData.location_id) {
      toast.error('Please select a location');
      return;
    }

    try {
      if (editingGroup) {
        await updateGroup.mutateAsync({
          id: editingGroup.id as string,
          name: formData.name,
          location_id: formData.location_id,
          max_capacity: capacity,
        });
        toast.success('Group updated successfully');
      } else {
        await createGroup.mutateAsync({
          program_id: formData.program_id,
          location_id: formData.location_id,
          name: formData.name,
          max_capacity: capacity,
        });
        toast.success('Group created successfully');
      }
      handleCloseDialog();
    } catch (error) {
      toast.error((error as Error).message || 'Failed to save group');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      await deleteGroup.mutateAsync(id);
      toast.success('Group deleted successfully');
    } catch (error) {
      toast.error(
        (error as Error).message ||
          'Failed to delete group. It may be linked to program plans.'
      );
    }
  };

  const capacityExceedsMax =
    parseInt(formData.max_capacity, 10) > maxClassroomCapacity;

  return (
    <PageContainer
      title="Groups"
      description="Manage student groups with capacity constraints"
      actions={
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Create Group
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {editingGroup ? 'Edit Group' : 'Create New Group'}
                </DialogTitle>
                <DialogDescription>
                  {editingGroup
                    ? 'Update the group details below.'
                    : 'Create a new student group for a program.'}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="program">
                    Program <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.program_id}
                    onValueChange={(value) =>
                      setFormData({ ...formData, program_id: value })
                    }
                    disabled={!!editingGroup}
                  >
                    <SelectTrigger id="program">
                      <SelectValue placeholder="Select a program" />
                    </SelectTrigger>
                    <SelectContent>
                      {programs.map((program) => (
                        <SelectItem
                          key={program.id}
                          value={program.id as string}
                        >
                          {program.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="location">
                    Location <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.location_id}
                    onValueChange={(value) =>
                      setFormData({ ...formData, location_id: value })
                    }
                    disabled={!!editingGroup}
                  >
                    <SelectTrigger id="location">
                      <SelectValue placeholder="Select a location" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((location) => (
                        <SelectItem
                          key={location.id}
                          value={location.id as string}
                        >
                          {location.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-muted-foreground text-xs">
                    Each group operates at exactly one location
                  </p>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="name">
                    Group Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="e.g., Group 1, Morning Batch"
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="capacity">
                    Maximum Capacity <span className="text-destructive">*</span>
                  </Label>
                  <TooltipProvider>
                    <Tooltip open={capacityExceedsMax}>
                      <TooltipTrigger asChild>
                        <Input
                          id="capacity"
                          type="number"
                          min="1"
                          value={formData.max_capacity}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              max_capacity: e.target.value,
                            })
                          }
                          placeholder="e.g., 20"
                          required
                          className={
                            capacityExceedsMax ? 'border-destructive' : ''
                          }
                        />
                      </TooltipTrigger>
                      {capacityExceedsMax && (
                        <TooltipContent>
                          <p>
                            You do not have any classrooms of this capacity.
                            Maximum available: {maxClassroomCapacity}
                          </p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                  <p className="text-muted-foreground text-xs">
                    Maximum available classroom capacity: {maxClassroomCapacity}
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseDialog}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    !formData.program_id ||
                    !formData.location_id ||
                    !formData.name ||
                    !formData.max_capacity ||
                    capacityExceedsMax ||
                    createGroup.isPending ||
                    updateGroup.isPending
                  }
                >
                  {editingGroup ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold tracking-tight">
            All Groups
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-muted-foreground py-8 text-center">
              Loading...
            </div>
          ) : groups.length === 0 ? (
            <div className="text-muted-foreground py-8 text-center">
              No groups yet. Create your first group to get started.
            </div>
          ) : (
            <div className="w-full overflow-hidden rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Group Name</TableHead>
                    <TableHead>Program</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-right">Max Capacity</TableHead>
                    <TableHead className="text-right">
                      Current Enrolled
                    </TableHead>
                    <TableHead>Utilization</TableHead>
                    <TableHead className="w-[70px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groups.map((group) => {
                    const utilization =
                      ((group.current_enrollment_count as number) /
                        (group.max_capacity as number)) *
                      100;
                    return (
                      <TableRow key={group.id}>
                        <TableCell className="font-medium">
                          {group.name}
                        </TableCell>
                        <TableCell>
                          {programMap.get(group.program_id as string) || 'N/A'}
                        </TableCell>
                        <TableCell>
                          {locationMap.get(group.location_id as string) ||
                            'N/A'}
                        </TableCell>
                        <TableCell className="text-right">
                          {group.max_capacity}
                        </TableCell>
                        <TableCell className="text-right">
                          {group.current_enrollment_count}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress
                              value={utilization}
                              className="h-2 w-20"
                            />
                            <span className="text-muted-foreground text-xs">
                              {utilization.toFixed(0)}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                className="h-8 w-8 p-0"
                                aria-label="Actions"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleOpenEditDialog(group)}
                              >
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  handleDelete(
                                    group.id as string,
                                    group.name as string
                                  )
                                }
                                className="text-destructive"
                              >
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
