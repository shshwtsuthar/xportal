'use client';

import { useFormContext } from 'react-hook-form';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CountrySelect } from '@/components/ui/country-select';
import { Checkbox } from '@/components/ui/checkbox';
import { ApplicationFormValues } from '@/lib/validators/application';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const Step3_Cricos = () => {
  const form = useFormContext<ApplicationFormValues>();
  const isInternational = form.watch('is_international');
  const isUnder18 = form.watch('is_under_18');
  const providerAcceptingWelfare = form.watch(
    'provider_accepting_welfare_responsibility'
  );
  const providerArrangedOshc = form.watch('provider_arranged_oshc');
  const hasEnglishTest = form.watch('has_english_test');
  const hasPreviousStudy = form.watch('has_previous_study_australia');

  // OSHC Providers (5 approved providers)
  const oshcProviders = [
    { value: 'Allianz', label: 'Allianz' },
    { value: 'BUPA', label: 'BUPA' },
    { value: 'Medibank', label: 'Medibank' },
    { value: 'NIB', label: 'NIB' },
    { value: 'AHM', label: 'AHM' },
  ];

  // English Test Types
  const englishTestTypes = [
    { value: 'IELTS', label: 'IELTS' },
    { value: 'TOEFL iBT', label: 'TOEFL iBT' },
    { value: 'PTE', label: 'PTE' },
    { value: 'Cambridge CAE', label: 'Cambridge CAE' },
    { value: 'OET', label: 'OET' },
    { value: 'Other', label: 'Other' },
  ];

  return (
    <div className="grid gap-6">
      {/* International Student Checkbox */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">CRICOS</CardTitle>
        </CardHeader>
        <CardContent>
          <FormField
            control={form.control}
            name="is_international"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2">
                <FormControl>
                  <Checkbox
                    checked={!!field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormLabel>International student</FormLabel>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      {/* Show CRICOS fields only if international */}
      {isInternational && (
        <>
          {/* Passport & Visa Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-medium">
                Passport & Visa Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
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
                name="passport_issue_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Passport issue date</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={
                          field.value
                            ? typeof field.value === 'string'
                              ? field.value
                              : field.value instanceof Date
                                ? field.value.toISOString().split('T')[0]
                                : ''
                            : ''
                        }
                        onChange={(e) => field.onChange(e.target.value || '')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="passport_expiry_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Passport expiry date</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={
                          field.value
                            ? typeof field.value === 'string'
                              ? field.value
                              : field.value instanceof Date
                                ? field.value.toISOString().split('T')[0]
                                : ''
                            : ''
                        }
                        onChange={(e) => field.onChange(e.target.value || '')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="place_of_birth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Place of birth</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="As shown on passport" />
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
                name="visa_application_office"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>
                      Department of Home Affairs office where visa application
                      was made or will be made
                    </FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., Sydney, Melbourne" />
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
                    <FormLabel>Country of citizenship *</FormLabel>
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
            </CardContent>
          </Card>

          {/* Under 18 Welfare Arrangements */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-medium">
                Under 18 Welfare Arrangements
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <FormField
                control={form.control}
                name="is_under_18"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Checkbox
                        checked={!!field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel>
                      Is student under 18 years at course commencement?
                    </FormLabel>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {isUnder18 && (
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="provider_accepting_welfare_responsibility"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Provider accepting responsibility for welfare
                          arrangements? *
                        </FormLabel>
                        <FormControl>
                          <Select
                            value={
                              field.value === undefined
                                ? undefined
                                : field.value
                                  ? 'yes'
                                  : 'no'
                            }
                            onValueChange={(value) => {
                              field.onChange(value === 'yes');
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="yes">Yes (CAAW)</SelectItem>
                              <SelectItem value="no">No</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {providerAcceptingWelfare === true && (
                    <FormField
                      control={form.control}
                      name="welfare_start_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nominated welfare start date *</FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              value={
                                field.value
                                  ? typeof field.value === 'string'
                                    ? field.value
                                    : field.value instanceof Date
                                      ? field.value.toISOString().split('T')[0]
                                      : ''
                                  : ''
                              }
                              onChange={(e) =>
                                field.onChange(e.target.value || '')
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {providerAcceptingWelfare === false && (
                    <>
                      <FormField
                        control={form.control}
                        name="g_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              Parent/Legal Guardian full name *
                            </FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="John Smith" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="g_relationship"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              Parent/Legal Guardian relationship to student *
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="Father, Mother, etc."
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="g_phone_number"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              Parent/Legal Guardian mobile phone
                            </FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="0400 000 000" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="g_email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Parent/Legal Guardian email</FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                {...field}
                                placeholder="guardian@example.com"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* OSHC (Overseas Student Health Cover) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-medium">
                Overseas Student Health Cover (OSHC)
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <FormField
                control={form.control}
                name="provider_arranged_oshc"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Checkbox
                        checked={!!field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel>Provider Arranged OSHC? *</FormLabel>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {providerArrangedOshc && (
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="oshc_provider_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>OSHC Provider Name *</FormLabel>
                        <FormControl>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select OSHC provider" />
                            </SelectTrigger>
                            <SelectContent>
                              {oshcProviders.map((provider) => (
                                <SelectItem
                                  key={provider.value}
                                  value={provider.value}
                                >
                                  {provider.label}
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
                    name="oshc_start_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>OSHC Start Date *</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            value={
                              field.value
                                ? typeof field.value === 'string'
                                  ? field.value
                                  : field.value instanceof Date
                                    ? field.value.toISOString().split('T')[0]
                                    : ''
                                : ''
                            }
                            onChange={(e) =>
                              field.onChange(e.target.value || '')
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="oshc_end_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>OSHC End Date *</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            value={
                              field.value
                                ? typeof field.value === 'string'
                                  ? field.value
                                  : field.value instanceof Date
                                    ? field.value.toISOString().split('T')[0]
                                    : ''
                                : ''
                            }
                            onChange={(e) =>
                              field.onChange(e.target.value || '')
                            }
                          />
                        </FormControl>
                        <FormDescription className="md:col-span-2">
                          OSHC must cover entire visa duration, typically 2-3
                          months after course end date
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* English Language Proficiency */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-medium">
                English Language Proficiency
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <FormField
                control={form.control}
                name="has_english_test"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Checkbox
                        checked={!!field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel>
                      Has student undertaken English language test?
                    </FormLabel>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {hasEnglishTest && (
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="english_test_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Test Type *</FormLabel>
                        <FormControl>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select test type" />
                            </SelectTrigger>
                            <SelectContent>
                              {englishTestTypes.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
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
                    name="ielts_score"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Test Score *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., 6.5" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="english_test_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Test Date</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            value={
                              field.value
                                ? typeof field.value === 'string'
                                  ? field.value
                                  : field.value instanceof Date
                                    ? field.value.toISOString().split('T')[0]
                                    : ''
                                : ''
                            }
                            onChange={(e) =>
                              field.onChange(e.target.value || '')
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Previous Study in Australia */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-medium">
                Previous Study in Australia
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <FormField
                control={form.control}
                name="has_previous_study_australia"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Checkbox
                        checked={!!field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel>
                      Has student previously studied in Australia?
                    </FormLabel>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {hasPreviousStudy && (
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="previous_provider_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Previous Provider Name *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Previous RTO name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="completed_previous_course"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Did student complete previous course? *
                        </FormLabel>
                        <FormControl>
                          <Select
                            value={
                              field.value === undefined
                                ? undefined
                                : field.value
                                  ? 'yes'
                                  : 'no'
                            }
                            onValueChange={(value) => {
                              field.onChange(value === 'yes');
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="yes">Yes</SelectItem>
                              <SelectItem value="no">No</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="has_release_letter"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Does student have release letter? *
                        </FormLabel>
                        <FormControl>
                          <Select
                            value={
                              field.value === undefined
                                ? undefined
                                : field.value
                                  ? 'yes'
                                  : 'no'
                            }
                            onValueChange={(value) => {
                              field.onChange(value === 'yes');
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="yes">Yes</SelectItem>
                              <SelectItem value="no">No</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Written Agreement & Consent */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-medium">
                Written Agreement & Consent
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <FormField
                control={form.control}
                name="written_agreement_accepted"
                render={({ field }) => (
                  <FormItem className="flex items-start gap-2">
                    <FormControl>
                      <Checkbox
                        checked={!!field.value}
                        onCheckedChange={field.onChange}
                        className="mt-1"
                      />
                    </FormControl>
                    <div className="space-y-1">
                      <FormLabel>
                        Student acknowledgment that they have read and accepted
                        written agreement *
                      </FormLabel>
                      <FormDescription>
                        I acknowledge that I have read and accepted the written
                        agreement for this course.
                      </FormDescription>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="written_agreement_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of Acceptance *</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={
                          field.value
                            ? typeof field.value === 'string'
                              ? field.value
                              : field.value instanceof Date
                                ? field.value.toISOString().split('T')[0]
                                : ''
                            : ''
                        }
                        onChange={(e) => field.onChange(e.target.value || '')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="privacy_notice_accepted"
                render={({ field }) => (
                  <FormItem className="flex items-start gap-2">
                    <FormControl>
                      <Checkbox
                        checked={!!field.value}
                        onCheckedChange={field.onChange}
                        className="mt-1"
                      />
                    </FormControl>
                    <div className="space-y-1">
                      <FormLabel>
                        Privacy and Data Sharing Notice Acceptance *
                      </FormLabel>
                      <FormDescription>
                        I acknowledge that my personal information may be shared
                        with Australian Government (Department of Education,
                        Department of Home Affairs), designated authorities,
                        Tuition Protection Service (TPS), and ESOS Assurance
                        Fund Manager for ESOS compliance, visa monitoring, and
                        immigration control purposes.
                      </FormDescription>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};
