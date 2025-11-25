'use client';

import { UseFormReturn } from 'react-hook-form';
import { BankInfoFormValues } from '@/lib/validators/bank-info';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

type Props = {
  form: UseFormReturn<BankInfoFormValues>;
};

export function BankInfoForm({ form }: Props) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <FormField
        control={form.control}
        name="bank_name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Bank Name</FormLabel>
            <FormControl>
              <Input placeholder="e.g. Commonwealth Bank" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="bank_account_name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Account Name</FormLabel>
            <FormControl>
              <Input placeholder="e.g. Ashford College Pty Ltd" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="bank_bsb"
        render={({ field }) => (
          <FormItem>
            <FormLabel>BSB</FormLabel>
            <FormControl>
              <Input
                placeholder="e.g. 123456"
                maxLength={6}
                {...field}
                onChange={(e) => {
                  // Only allow digits
                  const value = e.target.value.replace(/\D/g, '');
                  field.onChange(value);
                }}
              />
            </FormControl>
            <FormMessage />
            <p className="text-muted-foreground text-xs">
              Must be exactly 6 digits
            </p>
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="bank_account_number"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Account Number</FormLabel>
            <FormControl>
              <Input
                placeholder="e.g. 12345678"
                maxLength={20}
                {...field}
                onChange={(e) => {
                  // Only allow digits
                  const value = e.target.value.replace(/\D/g, '');
                  field.onChange(value);
                }}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
