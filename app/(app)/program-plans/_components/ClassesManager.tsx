'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
import { Badge } from '@/components/ui/badge';
import {
  CalendarIcon,
  Plus,
  Trash,
  RefreshCw,
  FileText,
  Calendar as CalendarRepeat,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useGetProgramPlanClasses } from '@/src/hooks/useGetProgramPlanClasses';
import { useUpsertProgramPlanClass } from '@/src/hooks/useUpsertProgramPlanClass';
import { useDeleteProgramPlanClass } from '@/src/hooks/useDeleteProgramPlanClass';
import { useGetTrainers } from '@/src/hooks/useGetTrainers';
import { useGetLocations } from '@/src/hooks/useGetLocations';
import { useGetClassrooms } from '@/src/hooks/useGetClassrooms';
import { useGetGroupsByLocation } from '@/src/hooks/useGetGroupsByLocation';
import {
  useGetClassTemplates,
  type ClassTemplate,
} from '@/src/hooks/useGetClassTemplates';
import {
  useExpandTemplate,
  type ExpandTemplateResult,
} from '@/src/hooks/useExpandTemplate';
import { useDeleteClassTemplate } from '@/src/hooks/useDeleteClassTemplate';
import { RecurringClassDialog } from './RecurringClassDialog';
import { ConflictResolutionModal } from './ConflictResolutionModal';

type ClassesManagerProps = {
  programPlanSubjectId: string;
  subjectStartDate: Date;
  subjectEndDate: Date;
  programId: string;
  groupCapacity?: number;
};

type ClassRow = {
  id?: string;
  class_date?: Date;
  start_time?: string;
  end_time?: string;
  trainer_id?: string;
  location_id?: string;
  classroom_id?: string;
  group_id?: string;
  class_type?: string;
  notes?: string;
};

export function ClassesManager({
  programPlanSubjectId,
  subjectStartDate,
  subjectEndDate,
  programId,
  groupCapacity,
}: ClassesManagerProps) {
  const [isAddingClass, setIsAddingClass] = useState(false);
  const [newClass, setNewClass] = useState<ClassRow>({});
  const [viewMode, setViewMode] = useState<'templates' | 'classes'>('classes');
  const [showRecurringDialog, setShowRecurringDialog] = useState(false);
  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] =
    useState<ClassTemplate | null>(null);
  const [detectedConflicts, setDetectedConflicts] = useState<
    ExpandTemplateResult['conflicts']
  >([]);

  const { data: classes = [], isLoading: classesLoading } =
    useGetProgramPlanClasses(programPlanSubjectId);
  const { data: templates = [], isLoading: templatesLoading } =
    useGetClassTemplates(programPlanSubjectId);
  const { data: trainers = [], isLoading: trainersLoading } = useGetTrainers();
  const { data: locations = [], isLoading: locationsLoading } =
    useGetLocations();
  const { data: classrooms = [], isLoading: classroomsLoading } =
    useGetClassrooms();

  // Fetch groups based on selected location and program
  const { data: groups = [], isLoading: groupsLoading } =
    useGetGroupsByLocation(programId, newClass.location_id);

  const upsertClass = useUpsertProgramPlanClass();
  const deleteClass = useDeleteProgramPlanClass();
  const expandTemplate = useExpandTemplate();
  const deleteTemplate = useDeleteClassTemplate();

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

      // Validate group is required
      if (!newClass.group_id) {
        toast.error('Please select a group');
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
        group_id: newClass.group_id, // Required - no null fallback
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

  // Check if a classroom is insufficient for the group capacity
  const isClassroomInsufficient = (classroomCapacity: number) => {
    return groupCapacity !== undefined && classroomCapacity < groupCapacity;
  };

  const handleReExpandTemplate = async (template: ClassTemplate) => {
    setSelectedTemplate(template);

    // Call expand to check for conflicts
    try {
      const result = await expandTemplate.mutateAsync({
        templateId: template.id,
        preserveEdited: true,
        programPlanSubjectId,
      });

      if (result.success) {
        if (result.conflicts && result.conflicts.length > 0) {
          // Show conflict modal
          setDetectedConflicts(result.conflicts);
          setConflictModalOpen(true);
        } else {
          // Success without conflicts
          toast.success(
            `Successfully re-expanded template: ${result.classes_created} class${result.classes_created !== 1 ? 'es' : ''} created`
          );
        }
      } else {
        toast.error(result.error || 'Failed to re-expand template');
      }
    } catch (error) {
      toast.error('Failed to re-expand template');
      console.error(error);
    }
  };

  const handleConflictResolution = async (
    action: 'preserve' | 'overwrite' | 'cancel'
  ) => {
    if (action === 'cancel' || !selectedTemplate) {
      setConflictModalOpen(false);
      setSelectedTemplate(null);
      setDetectedConflicts([]);
      return;
    }

    try {
      const result = await expandTemplate.mutateAsync({
        templateId: selectedTemplate.id,
        preserveEdited: action === 'preserve',
        programPlanSubjectId,
      });

      if (result.success) {
        toast.success(
          `Template re-expanded: ${result.classes_created} created, ${result.classes_preserved || 0} preserved`
        );
        setConflictModalOpen(false);
        setSelectedTemplate(null);
        setDetectedConflicts([]);
      } else {
        toast.error(result.error || 'Failed to re-expand template');
      }
    } catch (error) {
      toast.error('Failed to re-expand template');
      console.error(error);
    }
  };

  const handleDeleteTemplate = async (
    templateId: string,
    templateName: string | null
  ) => {
    if (
      !confirm(
        `Delete template "${templateName || 'Untitled'}"?\n\nGenerated classes will remain as standalone classes.`
      )
    ) {
      return;
    }

    try {
      await deleteTemplate.mutateAsync({
        templateId,
        programPlanSubjectId,
      });
      toast.success('Template deleted successfully');
    } catch (error) {
      toast.error('Failed to delete template');
      console.error(error);
    }
  };

  const getRecurrenceLabel = (template: ClassTemplate): string => {
    switch (template.recurrence_type) {
      case 'once':
        return 'Once';
      case 'daily':
        return `Every ${template.recurrence_pattern?.interval || 1} day(s)`;
      case 'weekly':
        const days = template.recurrence_pattern?.days_of_week || [];
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        return `Weekly: ${days.map((d: number) => dayNames[d]).join(', ')}`;
      case 'monthly':
        return `Monthly: Day ${template.recurrence_pattern?.day_of_month || 1}`;
      case 'custom':
        return 'Custom dates';
      default:
        return template.recurrence_type;
    }
  };

  return (
    <div>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <CardTitle className="text-sm">Class Sessions</CardTitle>
              <div className="flex items-center gap-1 rounded-md border p-1">
                <Button
                  variant={viewMode === 'classes' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('classes')}
                  className="h-7 text-xs"
                >
                  All Classes
                </Button>
                <Button
                  variant={viewMode === 'templates' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('templates')}
                  className="h-7 text-xs"
                >
                  Templates
                </Button>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowRecurringDialog(true)}
              >
                <CalendarRepeat className="mr-1 h-3 w-3" />
                Add Recurring
              </Button>
              <Button
                size="sm"
                onClick={() => setIsAddingClass(true)}
                disabled={isAddingClass}
              >
                <Plus className="mr-1 h-3 w-3" />
                Add Class
              </Button>
            </div>
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
                  <Label className="text-xs font-medium">Group *</Label>
                  <Select
                    value={newClass.group_id || ''}
                    onValueChange={(v) => updateNewClass('group_id', v)}
                    disabled={!newClass.location_id}
                  >
                    <SelectTrigger size="sm" className="w-full">
                      <SelectValue
                        placeholder={
                          newClass.location_id
                            ? 'Select group (required)'
                            : 'Select location first'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {groupsLoading ? (
                        <div className="text-muted-foreground px-2 py-1.5 text-xs">
                          Loading...
                        </div>
                      ) : groups.length === 0 ? (
                        <div className="text-muted-foreground px-2 py-1.5 text-xs">
                          No groups available for this location
                        </div>
                      ) : (
                        groups.map((g) => (
                          <SelectItem key={g.id} value={g.id as string}>
                            {g.name} ({g.current_enrollment_count}/
                            {g.max_capacity})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-muted-foreground text-xs">
                    Group determines which students see this class
                  </p>
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
                        <TooltipProvider>
                          {availableClassrooms.map((c) => {
                            const insufficient = isClassroomInsufficient(
                              c.capacity as number
                            );
                            return (
                              <Tooltip key={c.id}>
                                <TooltipTrigger asChild>
                                  <div>
                                    <SelectItem
                                      value={c.id as string}
                                      disabled={insufficient}
                                      className={
                                        insufficient
                                          ? 'text-muted-foreground opacity-50'
                                          : ''
                                      }
                                    >
                                      {c.name} (Capacity: {c.capacity})
                                    </SelectItem>
                                  </div>
                                </TooltipTrigger>
                                {insufficient && (
                                  <TooltipContent side="right">
                                    <p>
                                      Classroom capacity ({c.capacity}) is
                                      insufficient for group capacity (
                                      {groupCapacity})
                                    </p>
                                  </TooltipContent>
                                )}
                              </Tooltip>
                            );
                          })}
                        </TooltipProvider>
                      )}
                    </SelectContent>
                  </Select>
                  {groupCapacity && (
                    <p className="text-muted-foreground text-xs">
                      Classrooms with capacity less than {groupCapacity} are
                      disabled
                    </p>
                  )}
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

          {viewMode === 'templates' ? (
            // Templates view
            templatesLoading ? (
              <p className="text-muted-foreground text-sm">
                Loading templates...
              </p>
            ) : templates.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-muted-foreground mb-2 text-sm">
                  No recurring class templates yet
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowRecurringDialog(true)}
                >
                  <CalendarRepeat className="mr-2 h-4 w-4" />
                  Create First Template
                </Button>
              </div>
            ) : (
              <div className="w-full overflow-hidden rounded-md border">
                <Table>
                  <TableHeader className="border-b">
                    <TableRow className="divide-x">
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Pattern</TableHead>
                      <TableHead>Date Range</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Group</TableHead>
                      <TableHead>Classes</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y">
                    {templates.map((template) => (
                      <TableRow key={template.id} className="divide-x">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FileText className="text-muted-foreground h-4 w-4" />
                            <span className="font-medium">
                              {template.template_name || 'Untitled Template'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {template.recurrence_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {getRecurrenceLabel(template)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(template.start_date), 'MMM dd')} -{' '}
                          {format(new Date(template.end_date), 'MMM dd')}
                        </TableCell>
                        <TableCell className="text-sm">
                          {template.start_time} - {template.end_time}
                        </TableCell>
                        <TableCell className="text-sm">
                          {template.groups?.name || '—'}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Badge variant="secondary">
                              {template.generated_class_count} classes
                            </Badge>
                            {template.last_expanded_at && (
                              <p className="text-muted-foreground text-xs">
                                Last:{' '}
                                {format(
                                  new Date(template.last_expanded_at),
                                  'MMM dd, HH:mm'
                                )}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      handleReExpandTemplate(template)
                                    }
                                  >
                                    <RefreshCw className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  Re-expand template
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleDeleteTemplate(
                                  template.id,
                                  template.template_name
                                )
                              }
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )
          ) : // Classes view
          classesLoading ? (
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
                    <TableHead>Group</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y">
                  {classes.map((cls) => {
                    const fromTemplate = !!cls.template_id;
                    return (
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
                        <TableCell>{cls.groups?.name ?? '—'}</TableCell>
                        <TableCell>{cls.class_type || '—'}</TableCell>
                        <TableCell>
                          {fromTemplate ? (
                            <div className="flex flex-col gap-1">
                              <Badge
                                variant="outline"
                                className="w-fit text-xs"
                              >
                                📋 Template
                              </Badge>
                              {cls.is_manually_edited && (
                                <Badge
                                  variant="secondary"
                                  className="w-fit text-xs"
                                >
                                  ✏️ Edited
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">
                              Manual
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {fromTemplate ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    onClick={() =>
                                      handleDeleteClass(cls.id as string)
                                    }
                                    disabled
                                    className="opacity-50"
                                  >
                                    <Trash className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>
                                    Template-generated classes cannot be deleted
                                    individually.
                                  </p>
                                  <p className="text-xs">
                                    Re-expand or delete the template instead.
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            <Button
                              variant="ghost"
                              onClick={() =>
                                handleDeleteClass(cls.id as string)
                              }
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {classes.length === 0 && (
                    <TableRow className="divide-x">
                      <TableCell colSpan={8}>
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

      {/* Recurring Class Dialog */}
      <RecurringClassDialog
        open={showRecurringDialog}
        onOpenChange={setShowRecurringDialog}
        programPlanSubjectId={programPlanSubjectId}
        subjectStartDate={subjectStartDate}
        subjectEndDate={subjectEndDate}
        programId={programId}
        groupCapacity={groupCapacity}
      />

      {/* Conflict Resolution Modal */}
      <ConflictResolutionModal
        open={conflictModalOpen}
        onOpenChange={setConflictModalOpen}
        conflicts={detectedConflicts || []}
        onResolve={handleConflictResolution}
        isLoading={expandTemplate.isPending}
      />
    </div>
  );
}
