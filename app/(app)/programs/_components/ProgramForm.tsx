'use client';

import { UseFormReturn } from 'react-hook-form';
import { ProgramFormValues } from '@/lib/validators/program';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useGetProgramLevels } from '@/src/hooks/useGetProgramLevels';
import { useGetProgramFields } from '@/src/hooks/useGetProgramFields';
import { useGetProgramRecognitions } from '@/src/hooks/useGetProgramRecognitions';

type Props = {
  form: UseFormReturn<ProgramFormValues>;
};

export function ProgramForm({ form }: Props) {
  const { data: levels } = useGetProgramLevels();
  const { data: fields } = useGetProgramFields();
  const { data: recognitions } = useGetProgramRecognitions();

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <FormField
        control={form.control}
        name="code"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Program Code *</FormLabel>
            <FormControl>
              <Input placeholder="e.g. BSB50420" {...field} />
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
            <FormLabel>Program Name *</FormLabel>
            <FormControl>
              <Input
                placeholder="e.g. Diploma of Leadership and Management"
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
        name="level_of_education_id"
        render={({ field }) => (
          <FormItem>
            <FormLabel>AQF Level *</FormLabel>
            <FormControl>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {(levels ?? []).map((l) => (
                    <SelectItem key={l.id} value={String(l.id)}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <FormLabel>Field of Education *</FormLabel>
            <FormControl>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {(fields ?? []).map((f) => (
                    <SelectItem key={f.id} value={String(f.id)}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="recognition_id"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Recognition Status *</FormLabel>
            <FormControl>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {(recognitions ?? []).map((r) => (
                    <SelectItem key={r.id} value={String(r.id)}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <FormLabel>VET Program *</FormLabel>
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

      <FormField
        control={form.control}
        name="anzsco_id"
        render={({ field }) => (
          <FormItem>
            <FormLabel>ANZSCO Identifier</FormLabel>
            <FormControl>
              <Input placeholder="e.g. 132311" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="anzsic_id"
        render={({ field }) => (
          <FormItem>
            <FormLabel>ANZSIC Identifier</FormLabel>
            <FormControl>
              <Input placeholder="e.g. 0803" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
