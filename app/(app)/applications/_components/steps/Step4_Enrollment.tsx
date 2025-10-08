'use client';

import { UseFormReturn } from 'react-hook-form';
import { ApplicationFormValues } from '@/lib/validators/application';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useGetPrograms } from '@/src/hooks/useGetPrograms';

// Union type that can handle both draft and final application forms
type FlexibleFormValues =
  | ApplicationFormValues
  | {
      program_id?: string;
      [key: string]: unknown; // Allow other fields for flexibility
    };

type Props = {
  form: UseFormReturn<FlexibleFormValues>;
};

export function EnrollmentStep({ form }: Props) {
  const { data: programs, isLoading } = useGetPrograms();

  return (
    <div className="grid gap-6">
      <div>
        <h3 className="text-lg font-medium">Program Selection</h3>
        <p className="text-muted-foreground text-sm">
          Select the program you wish to apply for
        </p>
      </div>

      <div className="grid gap-4">
        <FormField
          control={form.control}
          name="program_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Program *</FormLabel>
              <FormControl>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a program" />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoading ? (
                      <div className="text-muted-foreground px-2 py-1.5 text-sm">
                        Loading programs...
                      </div>
                    ) : (programs ?? []).length === 0 ? (
                      <div className="text-muted-foreground px-2 py-1.5 text-sm">
                        No programs available
                      </div>
                    ) : (
                      programs?.map((p) => (
                        <SelectItem key={p.id} value={p.id as string}>
                          {p.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
