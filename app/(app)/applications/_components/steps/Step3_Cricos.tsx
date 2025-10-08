'use client';

import { useFormContext } from 'react-hook-form';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
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
import { Checkbox } from '@/components/ui/checkbox';
import { ApplicationFormValues } from '@/lib/validators/application';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const Step3_Cricos = () => {
  const form = useFormContext<ApplicationFormValues>();
  const isInternational = form.watch('is_international');

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">CRICOS</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="is_international"
            render={({ field }) => (
              <FormItem>
                <FormLabel>International student</FormLabel>
                <FormControl>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={!!field.value}
                      onCheckedChange={field.onChange}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {isInternational && (
            <>
              <FormField
                control={form.control}
                name="passport_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Passport number</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="E1234567" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="visa_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Visa type</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Student (subclass 500)" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="visa_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Visa number</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="0123ABC456" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="country_of_citizenship"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country of citizenship</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="AUS">Australia</SelectItem>
                          <SelectItem value="NZL">New Zealand</SelectItem>
                          <SelectItem value="CHN">China</SelectItem>
                          <SelectItem value="IND">India</SelectItem>
                          <SelectItem value="OTH">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ielts_score"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>IELTS score</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., 6.5" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
