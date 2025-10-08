'use client';

import { UseFormReturn } from 'react-hook-form';
import { SubjectFormValues } from '@/lib/validators/subject';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

type Props = {
  form: UseFormReturn<SubjectFormValues>;
};

export function SubjectForm({ form }: Props) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <FormField
        control={form.control}
        name="code"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Subject Code *</FormLabel>
            <FormControl>
              <Input placeholder="e.g. BSBCRT511" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem className="md:col-span-1">
            <FormLabel>Subject Name *</FormLabel>
            <FormControl>
              <Input
                placeholder="e.g. Develop critical thinking in others"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="nominal_hours"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Nominal Hours *</FormLabel>
            <FormControl>
              <Input
                type="number"
                min={0}
                max={9999}
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
        name="field_of_education_id"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Field of Education Identifier *</FormLabel>
            <FormControl>
              <Input placeholder="e.g. 080301" maxLength={6} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="vet_flag"
        render={({ field }) => (
          <FormItem>
            <FormLabel>VET Flag *</FormLabel>
            <FormControl>
              <RadioGroup
                value={field.value}
                onValueChange={field.onChange}
                className="flex items-center gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem id="vet-yes" value="Y" />
                  <label htmlFor="vet-yes" className="text-sm">
                    Yes
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem id="vet-no" value="N" />
                  <label htmlFor="vet-no" className="text-sm">
                    No
                  </label>
                </div>
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
