'use client';

import { useFormContext } from 'react-hook-form';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ApplicationFormValues } from '@/lib/validators/application';

export const Step2_AvetmissDetails = () => {
  const form = useFormContext<ApplicationFormValues>();
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* NAT00080: Client Gender. Must conform to AVETMISS standard codes. */}
      <FormField
        control={form.control}
        name="gender"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Gender</FormLabel>
            <FormControl>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="M">Male</SelectItem>
                  <SelectItem value="F">Female</SelectItem>
                  <SelectItem value="X">Non-Binary / X</SelectItem>
                  <SelectItem value="@">Not Stated (@)</SelectItem>
                </SelectContent>
              </Select>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="highest_school_level_id"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Highest school level completed</FormLabel>
            <FormControl>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="08">Year 12 or equivalent</SelectItem>
                  <SelectItem value="09">Year 11 or equivalent</SelectItem>
                  <SelectItem value="10">Year 10 or equivalent</SelectItem>
                  <SelectItem value="11">Year 9 or equivalent</SelectItem>
                  <SelectItem value="12">Year 8 or below</SelectItem>
                  <SelectItem value="02">Did not go to school</SelectItem>
                </SelectContent>
              </Select>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="indigenous_status_id"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Indigenous status</FormLabel>
            <FormControl>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Aboriginal</SelectItem>
                  <SelectItem value="2">Torres Strait Islander</SelectItem>
                  <SelectItem value="3">
                    Both Aboriginal and Torres Strait Islander
                  </SelectItem>
                  <SelectItem value="4">Neither</SelectItem>
                  <SelectItem value="9">Not stated</SelectItem>
                </SelectContent>
              </Select>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="labour_force_status_id"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Labour force status</FormLabel>
            <FormControl>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="01">Full-time</SelectItem>
                  <SelectItem value="02">Part-time</SelectItem>
                  <SelectItem value="03">Self-employed</SelectItem>
                  <SelectItem value="04">
                    Unemployed, seeking full-time
                  </SelectItem>
                  <SelectItem value="05">
                    Unemployed, seeking part-time
                  </SelectItem>
                  <SelectItem value="06">Not employed, not seeking</SelectItem>
                </SelectContent>
              </Select>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="country_of_birth_id"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Country of birth</FormLabel>
            <FormControl>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1101">Australia</SelectItem>
                  <SelectItem value="...">Other</SelectItem>
                </SelectContent>
              </Select>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="language_code"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Main language at home</FormLabel>
            <FormControl>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1201">English</SelectItem>
                  <SelectItem value="...">Other</SelectItem>
                </SelectContent>
              </Select>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="citizenship_status_code"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Citizenship status</FormLabel>
            <FormControl>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AUS">Australian citizen</SelectItem>
                  <SelectItem value="PR">Permanent resident</SelectItem>
                  <SelectItem value="INTL">International (visa)</SelectItem>
                </SelectContent>
              </Select>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* NAT00085 fields */}
      <FormField
        control={form.control}
        name="at_school_flag"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Currently at school</FormLabel>
            <FormControl>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Y">Yes</SelectItem>
                  <SelectItem value="N">No</SelectItem>
                </SelectContent>
              </Select>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Domestic-only USI; validation is conditional in submit phase */}
      <FormField
        control={form.control}
        name="usi"
        render={({ field }) => (
          <FormItem>
            <FormLabel>USI (domestic students)</FormLabel>
            <FormControl>
              <Input {...field} placeholder="Enter USI if known" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};
