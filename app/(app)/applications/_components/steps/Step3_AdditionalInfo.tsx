'use client';

import React, { useEffect, useMemo } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ApplicationFormValues } from '@/src/schemas';
import {
  useGetApplicationDisabilities,
  useGetApplicationPriorEducation,
} from '@/src/hooks/useGetApplicationRelations';
import { Tables } from '@/database.types';

type Props = {
  application: Tables<'applications'> | undefined;
};

// AVETMISS Disability Type Codes and Labels
const DISABILITY_TYPES = [
  { code: '11', label: 'Hearing/deaf' },
  { code: '12', label: 'Physical' },
  { code: '13', label: 'Intellectual' },
  { code: '14', label: 'Learning' },
  { code: '15', label: 'Mental illness' },
  { code: '16', label: 'Acquired brain impairment' },
  { code: '17', label: 'Vision' },
  { code: '18', label: 'Medical condition' },
  { code: '19', label: 'Other' },
] as const;

// AVETMISS Prior Education Achievement Codes and Labels
const PRIOR_EDUCATION_TYPES = [
  { code: '008', label: 'Bachelor degree or higher degree' },
  { code: '410', label: 'Advanced Diploma or Associate Degree' },
  { code: '420', label: 'Diploma (or Associate Diploma)' },
  { code: '511', label: 'Certificate IV (or Advanced Certificate/Technician)' },
  { code: '514', label: 'Certificate III (or Trade Certificate)' },
  { code: '521', label: 'Certificate II' },
  { code: '524', label: 'Certificate I' },
  {
    code: '990',
    label:
      'Other education (including certificates or overseas qualifications not listed above)',
  },
] as const;

// Recognition Types
const RECOGNITION_TYPES = [
  { code: 'A', label: 'Australian' },
  { code: 'E', label: 'Australian Equivalent' },
  { code: 'I', label: 'International' },
] as const;

export const Step3_AdditionalInfo = ({ application }: Props) => {
  const form = useFormContext<ApplicationFormValues>();
  const applicationId = application?.id;

  // Watch flag values for conditional rendering
  const disabilityFlag = useWatch({
    control: form.control,
    name: 'disability_flag',
  });
  const priorEducationFlag = useWatch({
    control: form.control,
    name: 'prior_education_flag',
  });

  // Watch form state arrays
  const disabilities =
    useWatch({
      control: form.control,
      name: 'disabilities',
      defaultValue: [],
    }) || [];

  const priorEducationWatched = useWatch({
    control: form.control,
    name: 'prior_education',
    defaultValue: [],
  });

  // Memoize priorEducation to stabilize reference for useMemo/useEffect dependencies
  const priorEducation = useMemo(
    () => priorEducationWatched || [],
    [priorEducationWatched]
  );

  // Fetch existing disabilities and prior education from database (for initial load)
  const { data: dbDisabilities = [] } =
    useGetApplicationDisabilities(applicationId);
  const { data: dbPriorEducation = [] } =
    useGetApplicationPriorEducation(applicationId);

  // Sync database data to form state on mount or when data loads
  useEffect(() => {
    if (application) {
      // Sync flags - AVETMISS allows Y, N, or @
      if (application.disability_flag && !form.getValues('disability_flag')) {
        form.setValue(
          'disability_flag',
          application.disability_flag as 'Y' | 'N' | '@'
        );
      }
      if (
        application.prior_education_flag &&
        !form.getValues('prior_education_flag')
      ) {
        form.setValue(
          'prior_education_flag',
          application.prior_education_flag as 'Y' | 'N' | '@'
        );
      }
    }
  }, [application, form]);

  // Load existing disabilities into form state
  useEffect(() => {
    if (!applicationId) return;

    if (dbDisabilities.length > 0) {
      const formDisabilities = dbDisabilities.map((d) => ({
        disability_type_id: d.disability_type_id,
      }));

      // Only update if form state doesn't match database
      const currentFormDisabilities = form.getValues('disabilities') || [];
      const formMatches =
        formDisabilities.length === currentFormDisabilities.length &&
        formDisabilities.every((dbDis) =>
          currentFormDisabilities.some(
            (formDis) => formDis.disability_type_id === dbDis.disability_type_id
          )
        );

      if (!formMatches) {
        form.setValue('disabilities', formDisabilities, { shouldDirty: false });
      }
    } else if (dbDisabilities.length === 0) {
      // Clear form state if database has no records (but only if we have an application)
      const currentFormDisabilities = form.getValues('disabilities') || [];
      if (currentFormDisabilities.length > 0) {
        form.setValue('disabilities', [], { shouldDirty: false });
      }
    }
  }, [dbDisabilities, applicationId, form]);

  // Load existing prior education into form state
  useEffect(() => {
    if (!applicationId) return;

    if (dbPriorEducation.length > 0) {
      const formPriorEd = dbPriorEducation.map((e) => ({
        prior_achievement_id: e.prior_achievement_id,
        recognition_type: e.recognition_type || undefined,
      }));

      // Only update if form state doesn't match database
      const currentFormPriorEd = form.getValues('prior_education') || [];
      const formMatches =
        formPriorEd.length === currentFormPriorEd.length &&
        formPriorEd.every((dbEd) =>
          currentFormPriorEd.some(
            (formEd) =>
              formEd.prior_achievement_id === dbEd.prior_achievement_id &&
              formEd.recognition_type === dbEd.recognition_type
          )
        );

      if (!formMatches) {
        form.setValue('prior_education', formPriorEd, { shouldDirty: false });
      }
    } else if (dbPriorEducation.length === 0) {
      // Clear form state if database has no records (but only if we have an application)
      const currentFormPriorEd = form.getValues('prior_education') || [];
      if (currentFormPriorEd.length > 0) {
        form.setValue('prior_education', [], { shouldDirty: false });
      }
    }
  }, [dbPriorEducation, applicationId, form]);

  // Handle disability flag change - AVETMISS requires Y, N, or @ only
  const handleDisabilityFlagChange = (value: 'Y' | 'N' | '@') => {
    form.setValue('disability_flag', value);

    // If flag is N or @, clear all disabilities
    if (value === 'N' || value === '@') {
      form.setValue('disabilities', []);
    }
  };

  // Handle prior education flag change - AVETMISS requires Y, N, or @ only
  const handlePriorEducationFlagChange = (value: 'Y' | 'N' | '@') => {
    form.setValue('prior_education_flag', value);

    // If flag is N or @, clear all prior education
    if (value === 'N' || value === '@') {
      form.setValue('prior_education', []);
    }
  };

  // Handle disability checkbox change
  const handleDisabilityToggle = (disabilityCode: string, checked: boolean) => {
    const currentDisabilities = form.getValues('disabilities') || [];

    if (checked) {
      // Validation: Cannot select "Other" (19) if specific types (11-18) are selected
      if (disabilityCode === '19') {
        const hasSpecificTypes = currentDisabilities.some((d) => {
          const code = d.disability_type_id;
          return code >= '11' && code <= '18';
        });
        if (hasSpecificTypes) {
          return; // Don't add if specific types exist
        }
      } else {
        // If selecting a specific type, remove "Other" if it exists
        const filtered = currentDisabilities.filter(
          (d) => d.disability_type_id !== '19'
        );
        form.setValue('disabilities', [
          ...filtered,
          { disability_type_id: disabilityCode },
        ]);
        return;
      }

      // Add the disability
      form.setValue('disabilities', [
        ...currentDisabilities,
        { disability_type_id: disabilityCode },
      ]);
    } else {
      // Remove the disability
      form.setValue(
        'disabilities',
        currentDisabilities.filter(
          (d) => d.disability_type_id !== disabilityCode
        )
      );
    }
  };

  // Handle prior education qualification checkbox change (main checkbox)
  const handlePriorEducationQualificationToggle = (
    educationCode: string,
    checked: boolean
  ) => {
    const currentPriorEd = form.getValues('prior_education') || [];

    if (!checked) {
      // Remove all recognition types for this qualification
      form.setValue(
        'prior_education',
        currentPriorEd.filter((e) => e.prior_achievement_id !== educationCode)
      );
      // Update checked state
      setCheckedQualifications((prev) => {
        const next = new Set(prev);
        next.delete(educationCode);
        return next;
      });
    } else {
      // When checked, show recognition type checkboxes
      // Update checked state
      setCheckedQualifications((prev) => {
        const next = new Set(prev);
        next.add(educationCode);
        return next;
      });
      // Note: The recognition type checkboxes will handle the actual addition
    }
  };

  // Handle prior education recognition type checkbox change
  const handlePriorEducationRecognitionToggle = (
    educationCode: string,
    recognitionType: string,
    checked: boolean
  ) => {
    const currentPriorEd = form.getValues('prior_education') || [];

    if (checked) {
      // Add the prior education with recognition type
      form.setValue('prior_education', [
        ...currentPriorEd,
        {
          prior_achievement_id: educationCode,
          recognition_type: recognitionType,
        },
      ]);
    } else {
      // Remove the specific prior education with this recognition type
      form.setValue(
        'prior_education',
        currentPriorEd.filter(
          (e) =>
            !(
              e.prior_achievement_id === educationCode &&
              e.recognition_type === recognitionType
            )
        )
      );
    }
  };

  // Check if a disability is selected in form state
  const isDisabilitySelected = (code: string) => {
    return disabilities.some((d) => d.disability_type_id === code);
  };

  // Check if a prior education is selected in form state
  const isPriorEducationSelected = useMemo(() => {
    return (code: string, recognitionType: string) => {
      return (priorEducation || []).some(
        (e) =>
          e.prior_achievement_id === code &&
          e.recognition_type === recognitionType
      );
    };
  }, [priorEducation]);

  // Check if a qualification has any recognition types selected
  const hasAnyRecognitionForQualification = useMemo(() => {
    return (code: string) => {
      return RECOGNITION_TYPES.some((rt) =>
        isPriorEducationSelected(code, rt.code)
      );
    };
  }, [isPriorEducationSelected]);

  // Track which qualifications have their main checkbox checked (for showing recognition types)
  // This is needed because recognition types should show when main checkbox is checked,
  // even if no recognition types are selected yet
  const [checkedQualifications, setCheckedQualifications] = React.useState<
    Set<string>
  >(new Set());

  // Sync checked qualifications with form state
  // This ensures the UI state matches the form data
  React.useEffect(() => {
    const checked = new Set<string>();
    (priorEducation || []).forEach((pe) => {
      checked.add(pe.prior_achievement_id);
    });
    // Only update if there's a difference to avoid unnecessary re-renders
    setCheckedQualifications((prev) => {
      if (
        prev.size !== checked.size ||
        !Array.from(prev).every((code) => checked.has(code))
      ) {
        return checked;
      }
      return prev;
    });
  }, [priorEducation]);

  return (
    <div className="grid gap-8">
      {/* Disability Information Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">
            Disability Information
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <FormField
            control={form.control}
            name="disability_flag"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Does the student have a disability, impairment or long-term
                  condition? *
                </FormLabel>
                <FormControl>
                  <Select
                    value={field.value || '@'}
                    onValueChange={(value) => {
                      const flagValue = value as 'Y' | 'N' | '@';
                      field.onChange(flagValue);
                      handleDisabilityFlagChange(flagValue);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Y">Yes</SelectItem>
                      <SelectItem value="N">No</SelectItem>
                      <SelectItem value="@">Not Stated</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Conditional: Show disability types if flag is Y */}
          {disabilityFlag === 'Y' && (
            <div className="grid gap-4">
              <FormLabel>
                If the student has indicated the presence of a disability,
                impairment or long-term condition, please select the area(s) in
                the following list: *
              </FormLabel>
              <div className="grid gap-3">
                {DISABILITY_TYPES.map((type) => (
                  <div key={type.code} className="flex items-center space-x-2">
                    <Checkbox
                      id={`disability-${type.code}`}
                      checked={Boolean(isDisabilitySelected(type.code))}
                      onCheckedChange={(checked) =>
                        handleDisabilityToggle(type.code, checked === true)
                      }
                    />
                    <label
                      htmlFor={`disability-${type.code}`}
                      className="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {type.label}
                    </label>
                  </div>
                ))}
              </div>
              <FormDescription>
                Note: Disability does NOT include short-term conditions
                (fractured leg, influenza) or corrected conditions
                (glasses/contact lenses).
              </FormDescription>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Prior Educational Achievement Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">
            Prior Educational Achievement
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <FormField
            control={form.control}
            name="prior_education_flag"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Has the student SUCCESSFULLY completed any of the
                  qualifications listed below? *
                </FormLabel>
                <FormControl>
                  <Select
                    value={field.value || '@'}
                    onValueChange={(value) => {
                      const flagValue = value as 'Y' | 'N' | '@';
                      field.onChange(flagValue);
                      handlePriorEducationFlagChange(flagValue);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Y">Yes</SelectItem>
                      <SelectItem value="N">No</SelectItem>
                      <SelectItem value="@">Not Stated</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Conditional: Show prior education types if flag is Y */}
          {priorEducationFlag === 'Y' && (
            <div className="grid gap-4">
              <FormLabel>
                If Yes, select ANY applicable qualifications and specify the
                recognition type for each: *
              </FormLabel>
              <div className="grid gap-4">
                {PRIOR_EDUCATION_TYPES.map((type) => {
                  const hasAnyRecognition = hasAnyRecognitionForQualification(
                    type.code
                  );
                  const isQualificationChecked = checkedQualifications.has(
                    type.code
                  );
                  return (
                    <div key={type.code} className="grid gap-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`prior-ed-${type.code}`}
                          checked={Boolean(
                            hasAnyRecognition || isQualificationChecked
                          )}
                          onCheckedChange={(checked) =>
                            handlePriorEducationQualificationToggle(
                              type.code,
                              checked === true
                            )
                          }
                        />
                        <label
                          htmlFor={`prior-ed-${type.code}`}
                          className="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {type.label}
                        </label>
                      </div>
                      {/* Recognition type selector - show when qualification is checked */}
                      {(hasAnyRecognition || isQualificationChecked) && (
                        <div className="ml-6 grid gap-2">
                          <FormLabel className="text-muted-foreground text-xs">
                            Recognition type (select at least one):
                          </FormLabel>
                          {RECOGNITION_TYPES.map((rt) => (
                            <div
                              key={rt.code}
                              className="flex items-center space-x-2"
                            >
                              <Checkbox
                                id={`prior-ed-${type.code}-${rt.code}`}
                                checked={Boolean(
                                  isPriorEducationSelected(type.code, rt.code)
                                )}
                                onCheckedChange={(checked) =>
                                  handlePriorEducationRecognitionToggle(
                                    type.code,
                                    rt.code,
                                    checked === true
                                  )
                                }
                              />
                              <label
                                htmlFor={`prior-ed-${type.code}-${rt.code}`}
                                className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                              >
                                {rt.label}
                              </label>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
