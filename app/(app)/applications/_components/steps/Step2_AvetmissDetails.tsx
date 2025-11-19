'use client';

import { useMemo } from 'react';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ApplicationFormValues,
  deriveIsInternational,
} from '@/src/lib/applicationSchema';

// AVETMISS Language Codes (NAT00080: Language Identifier)
// Standard 4-digit codes used in Australian VET data collection
const LANGUAGE_CODES = [
  { code: '1201', label: 'English' },
  { code: '2101', label: 'Afrikaans' },
  { code: '2201', label: 'Albanian' },
  { code: '2301', label: 'Amharic' },
  { code: '2401', label: 'Arabic' },
  { code: '2501', label: 'Armenian' },
  { code: '2601', label: 'Assyrian' },
  { code: '2701', label: 'Azerbaijani' },
  { code: '2801', label: 'Bengali' },
  { code: '2901', label: 'Bosnian' },
  { code: '3001', label: 'Bulgarian' },
  { code: '3101', label: 'Burmese' },
  { code: '3201', label: 'Cantonese' },
  { code: '3301', label: 'Catalan' },
  { code: '3401', label: 'Croatian' },
  { code: '3501', label: 'Czech' },
  { code: '3601', label: 'Danish' },
  { code: '3701', label: 'Dari' },
  { code: '3801', label: 'Dutch' },
  { code: '3901', label: 'Estonian' },
  { code: '4001', label: 'Fijian' },
  { code: '4101', label: 'Filipino (Tagalog)' },
  { code: '4201', label: 'Finnish' },
  { code: '4301', label: 'French' },
  { code: '4401', label: 'German' },
  { code: '4501', label: 'Greek' },
  { code: '4601', label: 'Gujarati' },
  { code: '4701', label: 'Hakka' },
  { code: '4801', label: 'Hebrew' },
  { code: '4901', label: 'Hindi' },
  { code: '5001', label: 'Hungarian' },
  { code: '5101', label: 'Indonesian' },
  { code: '5201', label: 'Italian' },
  { code: '5301', label: 'Japanese' },
  { code: '5401', label: 'Khmer (Cambodian)' },
  { code: '5501', label: 'Korean' },
  { code: '5601', label: 'Kurdish' },
  { code: '5701', label: 'Lao' },
  { code: '5801', label: 'Latvian' },
  { code: '5901', label: 'Lithuanian' },
  { code: '6001', label: 'Macedonian' },
  { code: '6101', label: 'Malay' },
  { code: '6201', label: 'Maltese' },
  { code: '6301', label: 'Mandarin' },
  { code: '6401', label: 'Nepali' },
  { code: '6501', label: 'Norwegian' },
  { code: '6601', label: 'Persian (Farsi)' },
  { code: '6701', label: 'Polish' },
  { code: '6801', label: 'Portuguese' },
  { code: '6901', label: 'Punjabi' },
  { code: '7001', label: 'Romanian' },
  { code: '7101', label: 'Russian' },
  { code: '7201', label: 'Samoan' },
  { code: '7301', label: 'Serbian' },
  { code: '7401', label: 'Sinhalese' },
  { code: '7501', label: 'Slovak' },
  { code: '7601', label: 'Slovenian' },
  { code: '7701', label: 'Somali' },
  { code: '7801', label: 'Spanish' },
  { code: '7901', label: 'Swedish' },
  { code: '8001', label: 'Tamil' },
  { code: '8101', label: 'Telugu' },
  { code: '8201', label: 'Thai' },
  { code: '8301', label: 'Tigrinya' },
  { code: '8401', label: 'Tongan' },
  { code: '8501', label: 'Turkish' },
  { code: '8601', label: 'Ukrainian' },
  { code: '8701', label: 'Urdu' },
  { code: '8801', label: 'Vietnamese' },
  { code: '8901', label: 'Yiddish' },
  { code: '9001', label: 'Yoruba' },
  { code: '9101', label: 'Other' },
] as const;

export const Step2_AvetmissDetails = () => {
  const form = useFormContext<ApplicationFormValues>();

  // Watch form values for reactive updates
  const dateOfBirth = useWatch({
    control: form.control,
    name: 'date_of_birth',
  });
  const state = useWatch({ control: form.control, name: 'state' });
  const isInternational = useWatch({
    control: form.control,
    name: 'is_international',
  });
  const highestSchoolLevel = useWatch({
    control: form.control,
    name: 'highest_school_level_id',
  });
  const vsn = useWatch({ control: form.control, name: 'vsn' });

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
    // From current year to current year - 70
    for (let i = 0; i <= 70; i++) {
      const year = currentYear - i;
      const twoDigit = String(year).slice(-2);
      years.push({ value: twoDigit, label: String(year) });
    }
    return years;
  }, []);

  // Check if VSN field should be shown (VIC, age < 25, domestic)
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
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGE_CODES.map((lang) => (
                        <SelectItem key={lang.code} value={lang.code}>
                          {lang.label}
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
            name="citizenship_status_code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Citizenship status *</FormLabel>
                <FormControl>
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value);
                      form.setValue(
                        'is_international',
                        deriveIsInternational(value)
                      );
                    }}
                  >
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
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value);
                      // Set year field as per AVETMISS rule when 'Did not go to school'
                      if (value === '02') {
                        form.setValue(
                          'year_highest_school_level_completed',
                          '@@@@'
                        );
                      }
                    }}
                  >
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
          <FormField
            control={form.control}
            name="year_highest_school_level_completed"
            render={({ field }) => {
              const isDisabled = highestSchoolLevel === '02';
              return (
                <FormItem>
                  <FormLabel>Year completed *</FormLabel>
                  <FormControl>
                    <Select
                      value={field.value || ''}
                      onValueChange={field.onChange}
                      disabled={isDisabled}
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
              );
            }}
          />

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
                  <FormLabel>Victorian Student Number (VSN) *</FormLabel>
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
                    <Input
                      {...field}
                      placeholder="Enter your 10-character USI"
                      className="w-full"
                      onChange={(e) => {
                        // Convert to uppercase and remove spaces
                        const value = e.target.value
                          .toUpperCase()
                          .replace(/\s/g, '');
                        field.onChange(value);
                      }}
                      maxLength={10}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              );
            }}
          />

          {/* USI Exemption */}
          <FormField
            control={form.control}
            name="usi_exemption_code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>USI exemption (if applicable)</FormLabel>
                <FormControl>
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      // Use 'none' to clear the exemption
                      if (value === 'none') {
                        form.setValue('usi_exemption_code', undefined);
                        return;
                      }
                      field.onChange(value);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select exemption (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No exemption</SelectItem>
                      <SelectItem value="INDIV">
                        INDIV - Individual Exemption
                      </SelectItem>
                      <SelectItem value="INTOFF">
                        INTOFF - Overseas/International
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
    </div>
  );
};
