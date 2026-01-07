'use client';

import { useState, useMemo } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { CalendarIcon, Eye, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useGetTrainers } from '@/src/hooks/useGetTrainers';
import { useGetLocations } from '@/src/hooks/useGetLocations';
import { useGetClassrooms } from '@/src/hooks/useGetClassrooms';
import { useGetGroupsByLocation } from '@/src/hooks/useGetGroupsByLocation';
import { useGetProgramPlanSubjects } from '@/src/hooks/useGetProgramPlanSubjects';
import {
  useBatchCreateTemplates,
  BatchCreateResult,
} from '@/src/hooks/useBatchCreateTemplates';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

type ProgramPlanRecurringDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  programPlanId: string;
  programId: string;
  groupCapacity?: number;
};

type RecurrenceType = 'once' | 'daily' | 'weekly' | 'monthly' | 'custom';

type FormDataValue =
  | string
  | number
  | Date
  | Date[]
  | number[]
  | RecurrenceType
  | boolean
  | undefined;

type RecurrencePattern =
  | Record<string, never> // empty object for 'once'
  | { interval: number } // for 'daily'
  | { interval: number; days_of_week: number[] } // for 'weekly'
  | { interval: number; day_of_month: number } // for 'monthly'
  | { dates: string[] }; // for 'custom'

type FormData = {
  template_name?: string;
  recurrence_type: RecurrenceType;
  start_date?: Date;
  end_date?: Date;
  start_time?: string;
  end_time?: string;
  location_id?: string;
  group_id?: string;
  trainer_id?: string;
  classroom_id?: string;
  class_type?:
    | 'THEORY'
    | 'WORKSHOP'
    | 'LAB'
    | 'ONLINE'
    | 'HYBRID'
    | 'ASSESSMENT';
  notes?: string;
  // Recurrence pattern fields
  daily_interval?: number;
  weekly_days?: number[]; // 0=Sunday, 6=Saturday
  monthly_day?: number; // 1-31
  custom_dates?: Date[];
  // Subject selection
  apply_to_all: boolean;
  selected_subject_ids?: string[];
};

export function ProgramPlanRecurringDialog({
  open,
  onOpenChange,
  programPlanId,
  programId,
  groupCapacity: _groupCapacity, // eslint-disable-line @typescript-eslint/no-unused-vars
}: ProgramPlanRecurringDialogProps) {
  const [formData, setFormData] = useState<FormData>({
    recurrence_type: 'weekly',
    daily_interval: 1,
    weekly_days: [],
    monthly_day: 1,
    custom_dates: [],
    apply_to_all: true,
    selected_subject_ids: [],
  });
  const [showPreview, setShowPreview] = useState(false);
  const [batchResult, setBatchResult] = useState<BatchCreateResult | null>(
    null
  );

  const { data: subjects = [] } = useGetProgramPlanSubjects(programPlanId);
  const { data: trainers = [] } = useGetTrainers();
  const { data: locations = [] } = useGetLocations();
  const { data: classrooms = [] } = useGetClassrooms();
  const { data: groups = [] } = useGetGroupsByLocation(
    programId,
    formData.location_id
  );

  const batchCreateTemplates = useBatchCreateTemplates();

  const availableClassrooms = classrooms.filter(
    (c) => c.location_id === formData.location_id
  );

  // Calculate which subjects will be affected
  const affectedSubjects = useMemo(() => {
    if (formData.apply_to_all) {
      return subjects;
    }
    return subjects.filter((s) =>
      formData.selected_subject_ids?.includes(s.id)
    );
  }, [subjects, formData.apply_to_all, formData.selected_subject_ids]);

  const updateFormData = (field: keyof FormData, value: FormDataValue) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleWeeklyDay = (day: number) => {
    setFormData((prev) => ({
      ...prev,
      weekly_days: prev.weekly_days?.includes(day)
        ? prev.weekly_days.filter((d) => d !== day)
        : [...(prev.weekly_days || []), day],
    }));
  };

  const toggleSubjectSelection = (subjectId: string) => {
    setFormData((prev) => ({
      ...prev,
      selected_subject_ids: prev.selected_subject_ids?.includes(subjectId)
        ? prev.selected_subject_ids.filter((id) => id !== subjectId)
        : [...(prev.selected_subject_ids || []), subjectId],
    }));
  };

  const buildRecurrencePattern = (): RecurrencePattern => {
    switch (formData.recurrence_type) {
      case 'once':
        return {};
      case 'daily':
        return { interval: formData.daily_interval || 1 };
      case 'weekly':
        return {
          interval: 1,
          days_of_week: formData.weekly_days || [],
        };
      case 'monthly':
        return {
          interval: 1,
          day_of_month: formData.monthly_day || 1,
        };
      case 'custom':
        return {
          dates: (formData.custom_dates || []).map((d) =>
            format(d, 'yyyy-MM-dd')
          ),
        };
      default:
        return {};
    }
  };

  const validateForm = (): string | null => {
    if (!formData.start_date) return 'Please select a start date';
    if (!formData.end_date) return 'Please select an end date';
    if (formData.start_date > formData.end_date)
      return 'Start date must be before end date';
    if (!formData.start_time) return 'Please select a start time';
    if (!formData.end_time) return 'Please select an end time';
    if (formData.start_time >= formData.end_time)
      return 'Start time must be before end time';
    if (!formData.location_id) return 'Please select a location';
    if (!formData.group_id) return 'Please select a group';

    if (affectedSubjects.length === 0) {
      return 'Please select at least one subject to apply the pattern to';
    }

    // Validate recurrence pattern
    if (
      formData.recurrence_type === 'weekly' &&
      (!formData.weekly_days || formData.weekly_days.length === 0)
    ) {
      return 'Please select at least one day of the week';
    }
    if (
      formData.recurrence_type === 'custom' &&
      (!formData.custom_dates || formData.custom_dates.length === 0)
    ) {
      return 'Please select at least one date';
    }

    return null;
  };

  const handlePreview = async () => {
    const error = validateForm();
    if (error) {
      toast.error(error);
      return;
    }

    // For preview, we'll create a temporary template for the first subject
    // to show what the pattern would look like
    try {
      const firstSubject = affectedSubjects[0];
      if (!firstSubject) {
        toast.error('No subjects available');
        return;
      }

      // This is a simplified preview - we'll show the pattern but not create actual templates yet
      // The real creation happens on "Create for All Subjects"
      setShowPreview(true);

      // For now, we'll just show what subjects would be affected
      // A full preview would require creating temporary templates for each subject
      // which is complex, so we'll show the subjects list instead
    } catch (error) {
      toast.error('Failed to generate preview');
      console.error(error);
    }
  };

  const handleCreate = async () => {
    if (affectedSubjects.length === 0) {
      toast.error('Please select at least one subject');
      return;
    }

    try {
      const result = await batchCreateTemplates.mutateAsync({
        programPlanId,
        subjects: affectedSubjects,
        template_name: formData.template_name || null,
        recurrence_type: formData.recurrence_type,
        start_date: formData.start_date!,
        end_date: formData.end_date!,
        recurrence_pattern: buildRecurrencePattern(),
        start_time: formData.start_time!,
        end_time: formData.end_time!,
        trainer_id: formData.trainer_id || null,
        location_id: formData.location_id!,
        classroom_id: formData.classroom_id || null,
        group_id: formData.group_id!,
        class_type: formData.class_type || null,
        notes: formData.notes || null,
      });

      setBatchResult(result);

      if (result.success) {
        const subjectWord =
          result.successful_subjects === 1 ? 'subject' : 'subjects';
        toast.success(
          `Successfully created ${result.total_classes_created} classes across ${result.successful_subjects} ${subjectWord}` +
            (result.total_blackout_dates_skipped > 0
              ? ` (${result.total_blackout_dates_skipped} dates skipped due to blackouts)`
              : '')
        );
        onOpenChange(false);
        // Reset form
        setFormData({
          recurrence_type: 'weekly',
          daily_interval: 1,
          weekly_days: [],
          monthly_day: 1,
          custom_dates: [],
          apply_to_all: true,
          selected_subject_ids: [],
        });
        setBatchResult(null);
        setShowPreview(false);
      } else {
        toast.error(
          `Failed to create templates for ${result.failed_subjects}/${result.total_subjects} subjects. Check details below.`
        );
      }
    } catch (error) {
      toast.error('Failed to create classes');
      console.error(error);
    }
  };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Create Classes for All Subjects
          </DialogTitle>
          <DialogDescription>
            Set up a recurring pattern that will be applied to multiple subjects
            at once. Each subject will get its own template that can be managed
            independently.
          </DialogDescription>
        </DialogHeader>

        {!showPreview ? (
          <div className="space-y-6 py-4">
            {/* Template Name */}
            <div className="space-y-2">
              <Label htmlFor="template_name">Template Name (Optional)</Label>
              <Input
                id="template_name"
                placeholder="e.g., Weekly Sunday Workshops"
                value={formData.template_name || ''}
                onChange={(e) =>
                  updateFormData('template_name', e.target.value)
                }
              />
            </div>

            {/* Subject Selection */}
            <div className="space-y-3">
              <Label>Apply Pattern To</Label>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="apply_to_all"
                    checked={formData.apply_to_all}
                    onCheckedChange={(checked) =>
                      updateFormData('apply_to_all', Boolean(checked))
                    }
                  />
                  <Label htmlFor="apply_to_all" className="text-sm font-normal">
                    All subjects ({subjects.length} total)
                  </Label>
                </div>
                {!formData.apply_to_all && (
                  <div className="ml-6 space-y-2">
                    <Label className="text-muted-foreground text-xs">
                      Select specific subjects:
                    </Label>
                    <ScrollArea className="h-32 rounded border p-2">
                      <div className="space-y-2">
                        {subjects.map((subject) => (
                          <div
                            key={subject.id}
                            className="flex items-center space-x-2"
                          >
                            <Checkbox
                              id={`subject-${subject.id}`}
                              checked={formData.selected_subject_ids?.includes(
                                subject.id
                              )}
                              onCheckedChange={() =>
                                toggleSubjectSelection(subject.id)
                              }
                            />
                            <Label
                              htmlFor={`subject-${subject.id}`}
                              className="flex-1 text-xs font-normal"
                            >
                              <div className="flex items-center justify-between">
                                <span>
                                  {subject.subjects?.name || 'Unknown Subject'}
                                </span>
                                <span className="text-muted-foreground">
                                  {format(
                                    new Date(subject.start_date),
                                    'MMM dd'
                                  )}{' '}
                                  -{' '}
                                  {format(new Date(subject.end_date), 'MMM dd')}
                                </span>
                              </div>
                            </Label>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                    <div className="text-muted-foreground text-xs">
                      Selected: {affectedSubjects.length} subjects
                    </div>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Recurrence Type */}
            <div className="space-y-2">
              <Label>Recurrence Type</Label>
              <div className="grid grid-cols-5 gap-2">
                {(
                  [
                    'once',
                    'daily',
                    'weekly',
                    'monthly',
                    'custom',
                  ] as RecurrenceType[]
                ).map((type) => (
                  <Button
                    key={type}
                    type="button"
                    variant={
                      formData.recurrence_type === type ? 'default' : 'outline'
                    }
                    size="sm"
                    onClick={() => updateFormData('recurrence_type', type)}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Button>
                ))}
              </div>
            </div>

            {/* Conditional Pattern Fields */}
            {formData.recurrence_type === 'daily' && (
              <div className="space-y-2">
                <Label htmlFor="daily_interval">Repeat every ___ days</Label>
                <Input
                  id="daily_interval"
                  type="number"
                  min="1"
                  value={formData.daily_interval || 1}
                  onChange={(e) =>
                    updateFormData(
                      'daily_interval',
                      parseInt(e.target.value) || 1
                    )
                  }
                />
              </div>
            )}

            {formData.recurrence_type === 'weekly' && (
              <div className="space-y-2">
                <Label>Days of Week</Label>
                <div className="flex gap-2">
                  {dayNames.map((day, index) => (
                    <Button
                      key={index}
                      type="button"
                      variant={
                        formData.weekly_days?.includes(index)
                          ? 'default'
                          : 'outline'
                      }
                      size="sm"
                      className="flex-1"
                      onClick={() => toggleWeeklyDay(index)}
                    >
                      {day}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {formData.recurrence_type === 'monthly' && (
              <div className="space-y-2">
                <Label htmlFor="monthly_day">Day of Month</Label>
                <Select
                  value={formData.monthly_day?.toString() || '1'}
                  onValueChange={(v) =>
                    updateFormData('monthly_day', parseInt(v))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                      <SelectItem key={day} value={day.toString()}>
                        {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {formData.recurrence_type === 'custom' && (
              <div className="space-y-2">
                <Label>Custom Dates</Label>
                <Calendar
                  mode="multiple"
                  selected={formData.custom_dates}
                  onSelect={(dates) =>
                    updateFormData('custom_dates', dates || [])
                  }
                />
              </div>
            )}

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !formData.start_date && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.start_date
                        ? format(formData.start_date, 'PPP')
                        : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.start_date}
                      onSelect={(date) => updateFormData('start_date', date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !formData.end_date && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.end_date
                        ? format(formData.end_date, 'PPP')
                        : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.end_date}
                      onSelect={(date) => updateFormData('end_date', date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_time">Start Time</Label>
                <Input
                  id="start_time"
                  type="time"
                  value={formData.start_time || ''}
                  onChange={(e) => updateFormData('start_time', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_time">End Time</Label>
                <Input
                  id="end_time"
                  type="time"
                  value={formData.end_time || ''}
                  onChange={(e) => updateFormData('end_time', e.target.value)}
                />
              </div>
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label>Location *</Label>
              <Select
                value={formData.location_id || ''}
                onValueChange={(v) => {
                  updateFormData('location_id', v);
                  updateFormData('classroom_id', '');
                  updateFormData('group_id', '');
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={l.id as string}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Group */}
            <div className="space-y-2">
              <Label>Group *</Label>
              <Select
                value={formData.group_id || ''}
                onValueChange={(v) => updateFormData('group_id', v)}
                disabled={!formData.location_id}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      formData.location_id
                        ? 'Select group'
                        : 'Select location first'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={g.id as string}>
                      {g.name} ({g.current_enrollment_count}/{g.max_capacity})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Trainer */}
            <div className="space-y-2">
              <Label>Trainer</Label>
              <Select
                value={formData.trainer_id || ''}
                onValueChange={(v) => updateFormData('trainer_id', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select trainer" />
                </SelectTrigger>
                <SelectContent>
                  {trainers.map((t) => (
                    <SelectItem key={t.id} value={t.id as string}>
                      {t.first_name} {t.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Classroom */}
            <div className="space-y-2">
              <Label>Classroom</Label>
              <Select
                value={formData.classroom_id || ''}
                onValueChange={(v) => updateFormData('classroom_id', v)}
                disabled={!formData.location_id}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select classroom" />
                </SelectTrigger>
                <SelectContent>
                  {availableClassrooms.map((c) => (
                    <SelectItem key={c.id} value={c.id as string}>
                      {c.name} (Capacity: {c.capacity})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Class Type */}
            <div className="space-y-2">
              <Label>Class Type</Label>
              <Select
                value={formData.class_type || ''}
                onValueChange={(v) => updateFormData('class_type', v)}
              >
                <SelectTrigger>
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

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Optional notes about this recurring class pattern"
                value={formData.notes || ''}
                onChange={(e) => updateFormData('notes', e.target.value)}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">
                Preview: Subjects to be Updated
              </h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(false)}
              >
                Back to Edit
              </Button>
            </div>

            <div className="space-y-3">
              <div className="text-muted-foreground text-sm">
                This pattern will be applied to the following{' '}
                {affectedSubjects.length} subjects:
              </div>

              <ScrollArea className="h-[300px] rounded-md border p-4">
                <div className="space-y-3">
                  {affectedSubjects.map((subject) => (
                    <div
                      key={subject.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="space-y-1">
                        <div className="text-sm font-medium">
                          {subject.subjects?.name || 'Unknown Subject'}
                        </div>
                        <div className="text-muted-foreground text-xs">
                          {subject.subjects?.code} •{' '}
                          {format(new Date(subject.start_date), 'MMM dd')} -{' '}
                          {format(new Date(subject.end_date), 'MMM dd')}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {formData.recurrence_type}
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className="text-muted-foreground text-sm">
                <strong>Pattern:</strong> {getRecurrenceLabel(formData)} •{' '}
                {formData.start_time} - {formData.end_time}
                {formData.start_date && formData.end_date && (
                  <>
                    {' '}
                    • {format(formData.start_date, 'MMM dd')} -{' '}
                    {format(formData.end_date, 'MMM dd')}
                  </>
                )}
              </div>

              {batchResult && (
                <div className="space-y-2">
                  <Separator />
                  <h5 className="text-sm font-medium">Results:</h5>
                  <div className="space-y-1 text-xs">
                    <div>
                      ✅ Successful: {batchResult.successful_subjects} subjects
                    </div>
                    {batchResult.failed_subjects > 0 && (
                      <div>
                        ❌ Failed: {batchResult.failed_subjects} subjects
                      </div>
                    )}
                    <div>
                      Total classes created: {batchResult.total_classes_created}
                    </div>
                    {batchResult.total_blackout_dates_skipped > 0 && (
                      <div>
                        Blackout dates skipped:{' '}
                        {batchResult.total_blackout_dates_skipped}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {!showPreview ? (
            <Button
              onClick={handlePreview}
              disabled={batchCreateTemplates.isPending}
            >
              <Eye className="mr-2 h-4 w-4" />
              Preview Subjects
            </Button>
          ) : (
            <Button
              onClick={handleCreate}
              disabled={
                batchCreateTemplates.isPending || affectedSubjects.length === 0
              }
            >
              Create for {affectedSubjects.length} Subject
              {affectedSubjects.length !== 1 ? 's' : ''}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Helper function to get recurrence label
function getRecurrenceLabel(formData: FormData): string {
  switch (formData.recurrence_type) {
    case 'once':
      return 'Once';
    case 'daily':
      return `Every ${formData.daily_interval || 1} day(s)`;
    case 'weekly':
      const days = formData.weekly_days || [];
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      return `Weekly: ${days.map((d: number) => dayNames[d]).join(', ')}`;
    case 'monthly':
      return `Monthly: Day ${formData.monthly_day || 1}`;
    case 'custom':
      return 'Custom dates';
    default:
      return formData.recurrence_type;
  }
}
