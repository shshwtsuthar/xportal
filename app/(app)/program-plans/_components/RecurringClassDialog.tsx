'use client';

import { useState, useEffect } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useGetTrainers } from '@/src/hooks/useGetTrainers';
import { useGetLocations } from '@/src/hooks/useGetLocations';
import { useGetClassrooms } from '@/src/hooks/useGetClassrooms';
import { useGetGroupsByLocation } from '@/src/hooks/useGetGroupsByLocation';
import { useCreateRecurringClasses } from '@/src/hooks/useCreateRecurringClasses';
import { Checkbox } from '@/components/ui/checkbox';

type RecurringClassDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  programPlanSubjectId: string;
  subjectStartDate: Date;
  subjectEndDate: Date;
  programId: string;
  groupCapacity?: number;
};

type RecurrenceType = 'once' | 'daily' | 'weekly' | 'monthly' | 'custom';

type FormDataValue =
  | string
  | number
  | boolean
  | Date
  | Date[]
  | number[]
  | RecurrenceType
  | undefined;

type RecurrencePattern =
  | Record<string, never> // empty object for 'once'
  | { interval: number } // for 'daily'
  | { interval: number; days_of_week: number[] } // for 'weekly'
  | { interval: number; day_of_month: number } // for 'monthly'
  | { dates: string[] }; // for 'custom'

type FormData = {
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
  filter_by_subject_range: boolean;
  // Recurrence pattern fields
  daily_interval?: number;
  weekly_days?: number[]; // 0=Sunday, 6=Saturday
  monthly_day?: number; // 1-31
  custom_dates?: Date[];
};

export function RecurringClassDialog({
  open,
  onOpenChange,
  programPlanSubjectId,
  subjectStartDate,
  subjectEndDate,
  programId,
  groupCapacity: _groupCapacity, // eslint-disable-line @typescript-eslint/no-unused-vars
}: RecurringClassDialogProps) {
  const [formData, setFormData] = useState<FormData>({
    recurrence_type: 'weekly',
    daily_interval: 1,
    weekly_days: [],
    monthly_day: 1,
    custom_dates: [],
    filter_by_subject_range: true,
  });

  const { data: trainers = [] } = useGetTrainers();
  const { data: locations = [] } = useGetLocations();
  const { data: classrooms = [] } = useGetClassrooms();
  const { data: groups = [] } = useGetGroupsByLocation(
    programId,
    formData.location_id
  );

  const createRecurringClasses = useCreateRecurringClasses();

  const availableClassrooms = classrooms.filter(
    (c) => c.location_id === formData.location_id
  );

  // Pre-fill dates when dialog opens
  useEffect(() => {
    if (open) {
      setFormData((prev) => ({
        ...prev,
        start_date: subjectStartDate,
        end_date: subjectEndDate,
      }));
    }
  }, [open, subjectStartDate, subjectEndDate]);

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

  const handleCreate = async () => {
    const error = validateForm();
    if (error) {
      toast.error(error);
      return;
    }

    try {
      const result = await createRecurringClasses.mutateAsync({
        programPlanSubjectId,
        recurrenceType: formData.recurrence_type,
        recurrencePattern: buildRecurrencePattern(),
        startDate: format(formData.start_date!, 'yyyy-MM-dd'),
        endDate: format(formData.end_date!, 'yyyy-MM-dd'),
        startTime: formData.start_time!,
        endTime: formData.end_time!,
        trainerId: formData.trainer_id || null,
        locationId: formData.location_id!,
        classroomId: formData.classroom_id || null,
        groupId: formData.group_id!,
        classType: formData.class_type || null,
        notes: formData.notes || null,
        filterBySubjectRange: formData.filter_by_subject_range,
      });

      if (result.success) {
        toast.success(
          `Successfully created ${result.classes_created} class${result.classes_created !== 1 ? 'es' : ''}` +
            (formData.filter_by_subject_range
              ? ' (filtered to subject date range)'
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
          filter_by_subject_range: true,
        });
      }
    } catch (error) {
      toast.error('Failed to create classes');
      console.error(error);
    }
  };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Recurring Classes</DialogTitle>
          <DialogDescription>
            Set up a pattern for recurring class sessions. Classes will be
            automatically created based on your pattern.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
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
                disabled={(date) =>
                  date < subjectStartDate || date > subjectEndDate
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
                    disabled={(date) =>
                      date < subjectStartDate || date > subjectEndDate
                    }
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
                    disabled={(date) =>
                      date < subjectStartDate || date > subjectEndDate
                    }
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

          {/* Filter by subject range */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="filter_by_subject_range"
              checked={formData.filter_by_subject_range}
              onCheckedChange={(checked) =>
                updateFormData('filter_by_subject_range', checked === true)
              }
            />
            <Label
              htmlFor="filter_by_subject_range"
              className="text-sm font-normal"
            >
              Only create classes within subject date range (
              {format(subjectStartDate, 'MMM dd')} -{' '}
              {format(subjectEndDate, 'MMM dd')})
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={createRecurringClasses.isPending}
          >
            Create Classes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
