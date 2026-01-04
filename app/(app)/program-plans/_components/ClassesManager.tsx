'use client';

import { useState } from 'react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CalendarIcon, Plus, Trash } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useGetProgramPlanClasses } from '@/src/hooks/useGetProgramPlanClasses';
import { useUpsertProgramPlanClass } from '@/src/hooks/useUpsertProgramPlanClass';
import { useDeleteProgramPlanClass } from '@/src/hooks/useDeleteProgramPlanClass';
import { useGetTrainers } from '@/src/hooks/useGetTrainers';
import { useGetLocations } from '@/src/hooks/useGetLocations';
import { useGetClassrooms } from '@/src/hooks/useGetClassrooms';

type ClassesManagerProps = {
  programPlanSubjectId: string;
  subjectStartDate: Date;
  subjectEndDate: Date;
};

type ClassRow = {
  id?: string;
  class_date?: Date;
  start_time?: string;
  end_time?: string;
  trainer_id?: string;
  location_id?: string;
  classroom_id?: string;
  class_type?: string;
  notes?: string;
};

export function ClassesManager({
  programPlanSubjectId,
  subjectStartDate,
  subjectEndDate,
}: ClassesManagerProps) {
  const [isAddingClass, setIsAddingClass] = useState(false);
  const [newClass, setNewClass] = useState<ClassRow>({});

  const { data: classes = [], isLoading: classesLoading } =
    useGetProgramPlanClasses(programPlanSubjectId);
  const { data: trainers = [], isLoading: trainersLoading } = useGetTrainers();
  const { data: locations = [], isLoading: locationsLoading } =
    useGetLocations();
  const { data: classrooms = [], isLoading: classroomsLoading } =
    useGetClassrooms();

  const upsertClass = useUpsertProgramPlanClass();
  const deleteClass = useDeleteProgramPlanClass();

  const updateNewClass = (
    field: keyof ClassRow,
    value: string | Date | undefined
  ) => {
    setNewClass((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddClass = async () => {
    try {
      if (!newClass.class_date || !newClass.start_time || !newClass.end_time) {
        toast.error('Please fill in date, start time, and end time');
        return;
      }

      // Validate location is required
      if (!newClass.location_id) {
        toast.error('Please select a location');
        return;
      }

      // Validate class date is within subject date range
      if (
        newClass.class_date < subjectStartDate ||
        newClass.class_date > subjectEndDate
      ) {
        toast.error(
          `Class date must be between ${format(subjectStartDate, 'MMM dd')} and ${format(subjectEndDate, 'MMM dd')}`
        );
        return;
      }

      // Validate start time is before end time
      if (
        newClass.start_time &&
        newClass.end_time &&
        newClass.start_time >= newClass.end_time
      ) {
        toast.error('Start time must be before end time');
        return;
      }

      await upsertClass.mutateAsync({
        program_plan_subject_id: programPlanSubjectId,
        class_date: format(newClass.class_date, 'yyyy-MM-dd'),
        start_time: newClass.start_time,
        end_time: newClass.end_time,
        trainer_id: newClass.trainer_id || null,
        location_id: newClass.location_id, // Required - no null fallback
        classroom_id: newClass.classroom_id || null,
        class_type:
          (newClass.class_type as
            | 'THEORY'
            | 'WORKSHOP'
            | 'LAB'
            | 'ONLINE'
            | 'HYBRID'
            | 'ASSESSMENT') || null,
        notes: newClass.notes || null,
      });

      setNewClass({});
      setIsAddingClass(false);
      toast.success('Class added successfully');
    } catch (e) {
      toast.error(String((e as Error).message || e));
    }
  };

  const handleDeleteClass = async (classId: string) => {
    try {
      await deleteClass.mutateAsync(classId);
      toast.success('Class deleted successfully');
    } catch (e) {
      toast.error(String((e as Error).message || e));
    }
  };

  const availableClassrooms = classrooms.filter(
    (c) => c.location_id === newClass.location_id
  );

  return (
    <div>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Class Sessions</CardTitle>
            <Button
              size="sm"
              onClick={() => setIsAddingClass(true)}
              disabled={isAddingClass}
            >
              <Plus className="mr-1 h-3 w-3" />
              Add Class
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {isAddingClass && (
            <div className="mb-4 rounded-lg border p-4">
              <h4 className="mb-4 text-sm font-medium">Add New Class</h4>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="grid gap-2 md:col-span-2 lg:col-span-1">
                  <Label className="text-xs font-medium">Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !newClass.class_date && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-3 w-3" />
                        {newClass.class_date
                          ? format(newClass.class_date, 'MMM dd')
                          : 'Pick date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={newClass.class_date}
                        onSelect={(d) =>
                          updateNewClass('class_date', d ?? undefined)
                        }
                        disabled={(date) =>
                          date < subjectStartDate || date > subjectEndDate
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs font-medium">Start Time *</Label>
                  <Input
                    type="time"
                    className="h-8"
                    value={newClass.start_time || ''}
                    onChange={(e) =>
                      updateNewClass('start_time', e.target.value)
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs font-medium">End Time *</Label>
                  <Input
                    type="time"
                    className="h-8"
                    value={newClass.end_time || ''}
                    onChange={(e) => updateNewClass('end_time', e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs font-medium">Trainer</Label>
                  <Select
                    value={newClass.trainer_id || ''}
                    onValueChange={(v) => updateNewClass('trainer_id', v)}
                  >
                    <SelectTrigger size="sm" className="w-full">
                      <SelectValue placeholder="Select trainer" />
                    </SelectTrigger>
                    <SelectContent>
                      {trainersLoading ? (
                        <div className="text-muted-foreground px-2 py-1.5 text-xs">
                          Loading...
                        </div>
                      ) : trainers.length === 0 ? (
                        <div className="text-muted-foreground px-2 py-1.5 text-xs">
                          No trainers available
                        </div>
                      ) : (
                        trainers.map((t) => (
                          <SelectItem key={t.id} value={t.id as string}>
                            {t.first_name} {t.last_name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs font-medium">Location *</Label>
                  <Select
                    value={newClass.location_id || ''}
                    onValueChange={(v) => {
                      updateNewClass('location_id', v);
                      updateNewClass('classroom_id', ''); // Clear classroom when location changes
                    }}
                  >
                    <SelectTrigger size="sm" className="w-full">
                      <SelectValue placeholder="Select location (required)" />
                    </SelectTrigger>
                    <SelectContent>
                      {locationsLoading ? (
                        <div className="text-muted-foreground px-2 py-1.5 text-xs">
                          Loading...
                        </div>
                      ) : locations.length === 0 ? (
                        <div className="text-muted-foreground px-2 py-1.5 text-xs">
                          No locations available
                        </div>
                      ) : (
                        locations.map((l) => (
                          <SelectItem key={l.id} value={l.id as string}>
                            {l.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs font-medium">Classroom</Label>
                  <Select
                    value={newClass.classroom_id || ''}
                    onValueChange={(v) => updateNewClass('classroom_id', v)}
                    disabled={!newClass.location_id}
                  >
                    <SelectTrigger size="sm" className="w-full">
                      <SelectValue placeholder="Select classroom" />
                    </SelectTrigger>
                    <SelectContent>
                      {classroomsLoading ? (
                        <div className="text-muted-foreground px-2 py-1.5 text-xs">
                          Loading...
                        </div>
                      ) : availableClassrooms.length === 0 ? (
                        <div className="text-muted-foreground px-2 py-1.5 text-xs">
                          No classrooms available
                        </div>
                      ) : (
                        availableClassrooms.map((c) => (
                          <SelectItem key={c.id} value={c.id as string}>
                            {c.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2 md:col-span-2 lg:col-span-1">
                  <Label className="text-xs font-medium">Type</Label>
                  <Select
                    value={newClass.class_type || ''}
                    onValueChange={(v) => updateNewClass('class_type', v)}
                  >
                    <SelectTrigger size="sm" className="w-full">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="THEORY">Theory</SelectItem>
                      <SelectItem value="WORKSHOP">Workshop</SelectItem>
                      <SelectItem value="LAB">Lab</SelectItem>
                      <SelectItem value="ONLINE">Online</SelectItem>
                      <SelectItem value="HYBRID">Hybrid</SelectItem>
                      <SelectItem value="ASSESSMENT">Assessment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button size="sm" onClick={handleAddClass}>
                  Add Class
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setIsAddingClass(false);
                    setNewClass({});
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {classesLoading ? (
            <p className="text-muted-foreground text-sm">Loading classes...</p>
          ) : (
            <div className="w-full overflow-hidden rounded-md border">
              <Table>
                <TableHeader className="border-b">
                  <TableRow className="divide-x">
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Trainer</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Classroom</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y">
                  {classes.map((cls) => (
                    <TableRow key={cls.id} className="divide-x">
                      <TableCell>
                        {cls.class_date
                          ? format(new Date(cls.class_date), 'MMM dd')
                          : '—'}
                      </TableCell>
                      <TableCell>
                        {cls.start_time && cls.end_time
                          ? `${cls.start_time} - ${cls.end_time}`
                          : '—'}
                      </TableCell>
                      <TableCell>
                        {cls.profiles
                          ? `${cls.profiles.first_name || ''} ${cls.profiles.last_name || ''}`.trim() ||
                            '—'
                          : '—'}
                      </TableCell>
                      <TableCell>
                        {cls.delivery_locations?.name ?? '—'}
                      </TableCell>
                      <TableCell>{cls.classrooms?.name ?? '—'}</TableCell>
                      <TableCell>{cls.class_type || '—'}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          onClick={() => handleDeleteClass(cls.id as string)}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {classes.length === 0 && (
                    <TableRow className="divide-x">
                      <TableCell colSpan={7}>
                        <p className="text-muted-foreground text-sm">
                          No classes added yet
                        </p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
