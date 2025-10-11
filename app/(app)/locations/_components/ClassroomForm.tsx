'use client';

import { UseFormReturn } from 'react-hook-form';
import { ClassroomFormValues } from '@/lib/validators/classroom';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type Props = {
  form: UseFormReturn<ClassroomFormValues>;
};

const typeOptions = [
  { value: 'CLASSROOM', label: 'Classroom' },
  { value: 'COMPUTER_LAB', label: 'Computer Lab' },
  { value: 'WORKSHOP', label: 'Workshop' },
  { value: 'KITCHEN', label: 'Kitchen' },
  { value: 'MEETING_ROOM', label: 'Meeting Room' },
  { value: 'OTHER', label: 'Other' },
];

const statusOptions = [
  { value: 'AVAILABLE', label: 'Available' },
  { value: 'MAINTENANCE', label: 'Under Maintenance' },
  { value: 'DECOMMISSIONED', label: 'Decommissioned' },
];

export function ClassroomForm({ form }: Props) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Classroom Name *</FormLabel>
            <FormControl>
              <Input placeholder="e.g. Room 1A" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="type"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Type *</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select classroom type" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {typeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="capacity"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Capacity *</FormLabel>
            <FormControl>
              <Input
                type="number"
                min={0}
                value={field.value ?? ''}
                onChange={(e) => field.onChange(Number(e.target.value))}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="status"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Status *</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem className="md:col-span-2">
            <FormLabel>Description</FormLabel>
            <FormControl>
              <Textarea
                placeholder="e.g. Contains 15 iMacs, projector has HDMI only"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
