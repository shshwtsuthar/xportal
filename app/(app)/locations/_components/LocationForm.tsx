'use client';

import { UseFormReturn } from 'react-hook-form';
import { LocationFormValues } from '@/lib/validators/location';
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
  form: UseFormReturn<LocationFormValues>;
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

export function LocationForm({ form }: Props) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <FormField
        control={form.control}
        name="location_id_internal"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Location Identifier *</FormLabel>
            <FormControl>
              <Input placeholder="e.g. GEEL-MAIN" {...field} />
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
            <FormLabel>Location Name *</FormLabel>
            <FormControl>
              <Input placeholder="e.g. Geelong Main Campus" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="building_property_name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Building/Property Name</FormLabel>
            <FormControl>
              <Input placeholder="e.g. The Innovation Hub" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="flat_unit_details"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Flat/Unit Details</FormLabel>
            <FormControl>
              <Input placeholder="e.g. Suite 3, Level 5" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="street_number"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Street Number</FormLabel>
            <FormControl>
              <Input placeholder="e.g. 123" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="street_name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Street Name *</FormLabel>
            <FormControl>
              <Input placeholder="e.g. Brougham Street" {...field} />
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
            <FormLabel>Suburb/City *</FormLabel>
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
            <FormLabel>State *</FormLabel>
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
            <FormLabel>Postcode *</FormLabel>
            <FormControl>
              <Input placeholder="e.g. 3220" maxLength={4} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
