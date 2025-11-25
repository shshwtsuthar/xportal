'use client';

import { UseFormReturn } from 'react-hook-form';
import { RtoFormValues } from '@/lib/validators/rto';
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

type Props = {
  form: UseFormReturn<RtoFormValues>;
};

const stateOptions = [
  { value: 'VIC', label: 'Victoria' },
  { value: 'NSW', label: 'New South Wales' },
  { value: 'QLD', label: 'Queensland' },
  { value: 'SA', label: 'South Australia' },
  { value: 'WA', label: 'Western Australia' },
  { value: 'TAS', label: 'Tasmania' },
  { value: 'NT', label: 'Northern Territory' },
  { value: 'ACT', label: 'Australian Capital Territory' },
];

const typeIdentifierOptions = [
  { value: 'RTO', label: 'RTO' },
  { value: 'CRICOS', label: 'CRICOS' },
  { value: 'TEQSA', label: 'TEQSA' },
];

export function RtoForm({ form }: Props) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>RTO Name *</FormLabel>
            <FormControl>
              <Input placeholder="e.g. Ashford College" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="rto_code"
        render={({ field }) => (
          <FormItem>
            <FormLabel>RTO Code *</FormLabel>
            <FormControl>
              <Input placeholder="e.g. 46296" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="type_identifier"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Type Identifier</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {typeIdentifierOptions.map((option) => (
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
        name="contact_name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Contact Name</FormLabel>
            <FormControl>
              <Input placeholder="e.g. Admin" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="address_line_1"
        render={({ field }) => (
          <FormItem className="md:col-span-2">
            <FormLabel>Address Line 1</FormLabel>
            <FormControl>
              <Input placeholder="e.g. Level 3/65 Brougham Street" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="suburb"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Suburb/City</FormLabel>
            <FormControl>
              <Input placeholder="e.g. Geelong" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="state"
        render={({ field }) => (
          <FormItem>
            <FormLabel>State</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select a state" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {stateOptions.map((option) => (
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
        name="postcode"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Postcode</FormLabel>
            <FormControl>
              <Input placeholder="e.g. 3220" maxLength={4} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="phone_number"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Phone Number</FormLabel>
            <FormControl>
              <Input placeholder="e.g. +61 2 1234 5678" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="facsimile_number"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Facsimile Number</FormLabel>
            <FormControl>
              <Input placeholder="e.g. +61 2 1234 5679" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="email_address"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Email Address</FormLabel>
            <FormControl>
              <Input placeholder="e.g. offers@ashford.edu.au" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="statistical_area_1_id"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Statistical Area 1 ID</FormLabel>
            <FormControl>
              <Input placeholder="e.g. SA1_001" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="statistical_area_2_id"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Statistical Area 2 ID</FormLabel>
            <FormControl>
              <Input placeholder="e.g. SA2_001" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="cricos_code"
        render={({ field }) => (
          <FormItem>
            <FormLabel>CRICOS Code</FormLabel>
            <FormControl>
              <Input placeholder="e.g. 12345A" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
