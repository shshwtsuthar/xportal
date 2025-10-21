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
    </div>
  );
}
