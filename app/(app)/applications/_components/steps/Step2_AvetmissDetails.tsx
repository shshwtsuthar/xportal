'use client';

import { useEffect, useMemo } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CountrySelect } from '@/components/ui/country-select';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ApplicationFormValues } from '@/lib/validators/application';
import { ExternalLink } from 'lucide-react';

export const Step2_AvetmissDetails = () => {
  const form = useFormContext<ApplicationFormValues>();

  // Watch values for conditional logic
  const highestSchoolLevelId = useWatch({
    control: form.control,
    name: 'highest_school_level_id',
  });
  const isInternational = useWatch({
    control: form.control,
    name: 'is_international',
  });
  const dateOfBirth = useWatch({
    control: form.control,
    name: 'date_of_birth',
  });
  const state = useWatch({
    control: form.control,
    name: 'state',
  });
  const vsn = useWatch({
    control: form.control,
    name: 'vsn',
  });
  const citizenshipStatusCode = useWatch({
    control: form.control,
    name: 'citizenship_status_code',
  });

  // Calculate age from date of birth
  const age = useMemo(() => {
    if (!dateOfBirth) return null;
    const dob =
      typeof dateOfBirth === 'string' ? new Date(dateOfBirth) : dateOfBirth;
    if (isNaN(dob.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  }, [dateOfBirth]);

  // Generate year options for Year Highest School Level Completed
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years: { value: string; label: string }[] = [];
    // From current year - 5 to current year - 70
    for (let i = 5; i <= 70; i++) {
      const year = currentYear - i;
      const twoDigit = String(year).slice(-2);
      years.push({ value: twoDigit, label: String(year) });
    }
    return years;
  }, []);

  // Auto-set year field to '@@' when "Did not go to school" is selected
  useEffect(() => {
    if (highestSchoolLevelId === '02') {
      form.setValue('year_highest_school_level_completed', '@@');
    }
  }, [highestSchoolLevelId, form]);

  // Auto-calculate survey_contact_status
  useEffect(() => {
    if (isInternational === true) {
      form.setValue('survey_contact_status', 'O');
    } else if (age !== null && age < 15) {
      form.setValue('survey_contact_status', 'M');
    } else {
      form.setValue('survey_contact_status', 'A');
    }
  }, [isInternational, age, form]);

  // Auto-check/uncheck International Student checkbox based on Citizenship Status
  useEffect(() => {
    const currentIsInternational = form.getValues('is_international');
    if (citizenshipStatusCode === 'INTL') {
      if (currentIsInternational !== true) {
        form.setValue('is_international', true);
      }
      return;
    }
    if (currentIsInternational !== false) {
      form.setValue('is_international', false);
    }
  }, [citizenshipStatusCode, form]);

  // Check if VSN field should be shown
  const showVSN = useMemo(() => {
    return (
      state === 'VIC' && age !== null && age < 25 && isInternational === false
    );
  }, [state, age, isInternational]);

  return (
    <div className="grid gap-8">
      {/* Demographic Information Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">
            Demographic Information
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {/* NAT00080: Client Gender. Must conform to AVETMISS standard codes. */}
          <FormField
            control={form.control}
            name="gender"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Gender *</FormLabel>
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
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
            name="indigenous_status_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Indigenous status *</FormLabel>
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
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
            name="country_of_birth_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Country of birth *</FormLabel>
                <FormControl>
                  <CountrySelect
                    value={field.value}
                    onValueChange={field.onChange}
                    placeholder="Select country"
                  />
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
                <FormLabel>Main language at home *</FormLabel>
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
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
                <FormLabel>Citizenship status *</FormLabel>
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
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
        </CardContent>
      </Card>

      {/* Education Background Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">
            Education Background
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="highest_school_level_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Highest school level completed *</FormLabel>
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
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

          {/* NAT00080: Year Highest School Level Completed */}
          {highestSchoolLevelId && highestSchoolLevelId !== '02' && (
            <FormField
              control={form.control}
              name="year_highest_school_level_completed"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Year completed *</FormLabel>
                  <FormControl>
                    <Select
                      value={field.value || ''}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select year" />
                      </SelectTrigger>
                      <SelectContent>
                        {yearOptions.map((year) => (
                          <SelectItem key={year.value} value={year.value}>
                            {year.label}
                          </SelectItem>
                        ))}
                        <SelectItem value="@@">Not provided</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* NAT00085 fields */}
          <FormField
            control={form.control}
            name="at_school_flag"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Currently at school *</FormLabel>
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
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
        </CardContent>
      </Card>

      {/* Employment Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">
            Employment Status
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="labour_force_status_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Labour force status *</FormLabel>
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
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
                      <SelectItem value="06">
                        Not employed, not seeking
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      {/* Student Identifiers Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">
            Student Identifiers
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {/* NAT00080: Victorian Student Number (VSN) - conditional display */}
          {showVSN && (
            <FormField
              control={form.control}
              name="vsn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Victorian Student Number (VSN)</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <Input
                        {...field}
                        placeholder="123456789"
                        maxLength={9}
                        className="md:max-w-xs"
                        onChange={(e) => {
                          // Only allow digits
                          const value = e.target.value.replace(/\D/g, '');
                          field.onChange(value);
                        }}
                        disabled={vsn === '000000000'}
                      />
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="no-vsn"
                          checked={vsn === '000000000'}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              form.setValue('vsn', '000000000');
                            } else {
                              form.setValue('vsn', '');
                            }
                          }}
                        />
                        <label
                          htmlFor="no-vsn"
                          className="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          I don&apos;t have a VSN
                        </label>
                      </div>
                    </div>
                  </FormControl>
                  <FormDescription>
                    Your 9-digit Victorian Student Number. Find this on your VCE
                    certificate or contact your previous school.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* NAT00080: USI - required for domestic students */}
          <FormField
            control={form.control}
            name="usi"
            render={({ field }) => {
              const isDomestic = isInternational === false;
              return (
                <FormItem>
                  <FormLabel>
                    USI (Unique Student Identifier)
                    {isDomestic && ' *'}
                  </FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <Input
                        {...field}
                        placeholder="Enter your 10-character USI"
                        className="md:max-w-xs"
                        onChange={(e) => {
                          // Convert to uppercase and remove spaces
                          const value = e.target.value
                            .toUpperCase()
                            .replace(/\s/g, '');
                          field.onChange(value);
                        }}
                        maxLength={10}
                      />
                      {isDomestic && (
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              window.open(
                                'https://www.usi.gov.au/students/create-usi',
                                '_blank'
                              );
                            }}
                          >
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Create USI
                          </Button>
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormDescription>
                    {isDomestic
                      ? "Your USI is required to receive your certificate. Don't have one? Create it now at usi.gov.au (takes 3 minutes)"
                      : 'International students studying in Australia should obtain a USI'}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              );
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
};
