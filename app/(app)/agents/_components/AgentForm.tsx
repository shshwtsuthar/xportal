'use client';

import { UseFormReturn } from 'react-hook-form';
import { AgentFormValues } from '@/lib/validators/agent';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useEffect } from 'react';

type Props = {
  form: UseFormReturn<AgentFormValues>;
};

export function AgentForm({ form }: Props) {
  // Auto-generate slug from name when empty or when user hasn't manually edited
  const name = form.watch('name');
  const slug = form.watch('slug') as string | undefined;
  useEffect(() => {
    if (!name) return;
    if (slug && slug.length > 0) return;
    const next = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-+|-+$)/g, '');
    form.setValue('slug', next, { shouldDirty: true });
  }, [name, slug, form]);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Agent Name *</FormLabel>
            <FormControl>
              <Input
                placeholder="e.g. Global Education Consultants"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Public link preview */}
      <div className="md:col-span-2">
        <FormLabel>Public intake link</FormLabel>
        <div className="mt-1 flex items-center gap-2">
          <Input
            readOnly
            value={`${typeof window !== 'undefined' ? window.location.origin : ''}/apply/agent/${form.getValues('slug') || ''}`}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              const url = `${window.location.origin}/apply/agent/${form.getValues('slug') || ''}`;
              navigator.clipboard.writeText(url);
            }}
            aria-label="Copy public link"
          >
            Copy
          </Button>
        </div>
      </div>

      {/* Slug for public link */}
      <FormField
        control={form.control}
        name="slug"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Public link slug *</FormLabel>
            <FormControl>
              <Input placeholder="e.g. global-education" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="contact_person"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Contact Person</FormLabel>
            <FormControl>
              <Input placeholder="e.g. John Smith" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="contact_email"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Contact Email</FormLabel>
            <FormControl>
              <Input
                type="email"
                placeholder="e.g. john@globaleducation.com"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="contact_phone"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Contact Phone</FormLabel>
            <FormControl>
              <Input placeholder="e.g. +61 2 1234 5678" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Commission Settings */}
      <div className="md:col-span-2">
        <h3 className="mb-4 text-lg font-medium">Commission Settings</h3>
      </div>

      <FormField
        control={form.control}
        name="commission_rate_percent"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Commission Rate (%) *</FormLabel>
            <FormControl>
              <Input
                type="number"
                step="0.01"
                min="0"
                max="100"
                placeholder="e.g. 20.00"
                {...field}
                onChange={(e) => {
                  const value =
                    e.target.value === '' ? 0 : parseFloat(e.target.value);
                  field.onChange(isNaN(value) ? 0 : value);
                }}
                value={field.value ?? 0}
              />
            </FormControl>
            <p className="text-muted-foreground text-xs">
              Percentage of commissionable payments (0-100). Example: 20.00
              means 20%.
            </p>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="commission_active"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <FormLabel className="text-base">Commissions Active</FormLabel>
              <p className="text-muted-foreground text-sm">
                Enable or disable commission calculations for this agent.
              </p>
            </div>
            <FormControl>
              <Switch
                checked={field.value ?? true}
                onCheckedChange={field.onChange}
              />
            </FormControl>
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="commission_start_date"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Commission Start Date (Optional)</FormLabel>
            <FormControl>
              <Input
                type="date"
                {...field}
                value={field.value || ''}
                onChange={(e) => field.onChange(e.target.value || null)}
              />
            </FormControl>
            <p className="text-muted-foreground text-xs">
              If set, commissions will only be calculated from this date
              onwards.
            </p>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="commission_end_date"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Commission End Date (Optional)</FormLabel>
            <FormControl>
              <Input
                type="date"
                {...field}
                value={field.value || ''}
                onChange={(e) => field.onChange(e.target.value || null)}
              />
            </FormControl>
            <p className="text-muted-foreground text-xs">
              If set, commissions will only be calculated until this date.
            </p>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
