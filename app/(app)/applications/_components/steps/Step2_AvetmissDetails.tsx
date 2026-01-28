'use client';

import { useMemo } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import ISO6391 from 'iso-639-1';
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
import { CountrySelect } from '@/components/ui/country-select';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ApplicationFormValues,
  deriveIsInternational,
  OVERSEAS_POSTCODE,
  OVERSEAS_STATE_CODE,
} from '@/src/lib/applicationSchema';

// AVETMISS Language Codes (NAT00080: Language Identifier)
// Mapping of language names to AVETMISS 4-digit codes
const AVETMISS_LANGUAGE_MAP: Record<string, string> = {
  English: '1201',
  Afrikaans: '2101',
  Albanian: '2201',
  Amharic: '2301',
  Arabic: '2401',
  Armenian: '2501',
  Assyrian: '2601',
  Azerbaijani: '2701',
  Bengali: '2801',
  Bosnian: '2901',
  Bulgarian: '3001',
  Burmese: '3101',
  Cantonese: '3201',
  Catalan: '3301',
  Croatian: '3401',
  Czech: '3501',
  Danish: '3601',
  Dari: '3701',
  Dutch: '3801',
  Estonian: '3901',
  Fijian: '4001',
  'Filipino (Tagalog)': '4101',
  Finnish: '4201',
  French: '4301',
  German: '4401',
  Greek: '4501',
  Gujarati: '4601',
  Hakka: '4701',
  Hebrew: '4801',
  Hindi: '4901',
  Hungarian: '5001',
  Indonesian: '5101',
  Italian: '5201',
  Japanese: '5301',
  'Khmer (Cambodian)': '5401',
  Korean: '5501',
  Kurdish: '5601',
  Lao: '5701',
  Latvian: '5801',
  Lithuanian: '5901',
  Macedonian: '6001',
  Malay: '6101',
  Maltese: '6201',
  Mandarin: '6301',
  Nepali: '6401',
  Norwegian: '6501',
  'Persian (Farsi)': '6601',
  Polish: '6701',
  Portuguese: '6801',
  Punjabi: '6901',
  Romanian: '7001',
  Russian: '7101',
  Samoan: '7201',
  Serbian: '7301',
  Sinhalese: '7401',
  Slovak: '7501',
  Slovenian: '7601',
  Somali: '7701',
  Spanish: '7801',
  Swedish: '7901',
  Tamil: '8001',
  Telugu: '8101',
  Thai: '8201',
  Tigrinya: '8301',
  Tongan: '8401',
  Turkish: '8501',
  Ukrainian: '8601',
  Urdu: '8701',
  Vietnamese: '8801',
  Yiddish: '8901',
  Yoruba: '9001',
  Other: '9101',
};

// Additional language name variations and mappings
const LANGUAGE_NAME_VARIATIONS: Record<string, string> = {
  Tagalog: 'Filipino (Tagalog)',
  Filipino: 'Filipino (Tagalog)',
  Khmer: 'Khmer (Cambodian)',
  Cambodian: 'Khmer (Cambodian)',
  Persian: 'Persian (Farsi)',
  Farsi: 'Persian (Farsi)',
  Sinhala: 'Sinhalese',
  'Mandarin Chinese': 'Mandarin',
  'Cantonese Chinese': 'Cantonese',
};

// Generate comprehensive language list
// Combines AVETMISS codes with ISO 639-1 languages
const generateLanguageList = (): Array<{ code: string; label: string }> => {
  const languages: Array<{ code: string; label: string }> = [];
  const usedLabels = new Set<string>();

  // First, add all AVETMISS languages
  Object.entries(AVETMISS_LANGUAGE_MAP).forEach(([label, code]) => {
    languages.push({ code, label });
    usedLabels.add(label.toLowerCase());
  });

  // Then, add all ISO 639-1 languages that aren't already included
  const isoLanguages = ISO6391.getAllNames();
  isoLanguages.forEach((isoName) => {
    const lowerName = isoName.toLowerCase();

    // Skip if already in AVETMISS list
    if (usedLabels.has(lowerName)) {
      return;
    }

    // Check for name variations
    const variation = LANGUAGE_NAME_VARIATIONS[isoName];
    if (variation && usedLabels.has(variation.toLowerCase())) {
      return;
    }

    // Use ISO 639-1 code as the code value
    const isoCode = ISO6391.getCode(isoName);
    if (isoCode) {
      languages.push({ code: isoCode.toUpperCase(), label: isoName });
      usedLabels.add(lowerName);
    }
  });

  // Sort alphabetically by label
  languages.sort((a, b) => a.label.localeCompare(b.label));

  return languages;
};

// Generate the comprehensive language list once
const LANGUAGE_CODES = generateLanguageList();

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
                      const isIntl = deriveIsInternational(value);
                      form.setValue('is_international', isIntl);
                      if (isIntl) {
                        // Only set street address to OVS/OSPC, not postal address
                        form.setValue('state', OVERSEAS_STATE_CODE, {
                          shouldDirty: true,
                          shouldValidate: false,
                        });
                        form.setValue('postcode', OVERSEAS_POSTCODE, {
                          shouldDirty: true,
                          shouldValidate: false,
                        });
                      }
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
        <CardContent className="grid gap-4">
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
                        className="w-full"
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
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* USI Row - 2 columns */}
          <div className="grid gap-4 md:grid-cols-2">
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
                        maxLength={10}
                        value={field.value ?? ''}
                        onChange={(e) => {
                          // Convert to uppercase and remove spaces
                          const value = e.target.value
                            .toUpperCase()
                            .replace(/\s/g, '');
                          field.onChange(value);
                        }}
                        onBlur={(e) => {
                          field.onBlur();
                          // Trigger validation after blur
                          form.trigger('usi');
                        }}
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
