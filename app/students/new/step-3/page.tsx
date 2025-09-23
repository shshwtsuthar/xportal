'use client';

import { useState } from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { LoadingButton } from '@/components/ui/loading-button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { WizardProgress } from '../components/wizard-progress';
import { useApplicationWizard } from '@/stores/application-wizard';
import { Step2AcademicInfoSchema, Step2AcademicInfo } from '@/lib/schemas/application-schemas';
import { 
  useCountries, 
  useLanguages, 
  useDisabilityTypes, 
  usePriorEducation,
  transformReferenceData 
} from '@/hooks/use-reference-data';
import { useEffect } from 'react';
import { SaveDraftButton } from '../components/save-draft-button';
import { DatePicker } from '@/components/ui/date-picker';
import { format, parseISO } from 'date-fns';

// =============================================================================
// STEP 2: ACADEMIC INFORMATION
// Matches backend ClientAvetmissDetails schema exactly
// =============================================================================

export default function Step2AcademicInformation() {
  const [isNavigating, setIsNavigating] = useState(false);
  const router = useRouter();
  const { updateStep2Data, nextStep, previousStep, draftId, formData, markDirty } = useApplicationWizard();
  
  // Reference data queries
  const { data: countriesData, isLoading: countriesLoading } = useCountries();
  const { data: languagesData, isLoading: languagesLoading } = useLanguages();
  const { data: disabilityTypesData, isLoading: disabilityTypesLoading } = useDisabilityTypes();
  const { data: priorEducationData, isLoading: priorEducationLoading } = usePriorEducation();
  
  // Transform reference data for select components
  const countries = transformReferenceData(countriesData);
  const languages = transformReferenceData(languagesData);
  const disabilityTypes = transformReferenceData(disabilityTypesData);
  const priorEducationOptions = transformReferenceData(priorEducationData);
  
  // Form state
  const [selectedDisabilityTypes, setSelectedDisabilityTypes] = useState<string[]>([]);
  const [selectedPriorEducation, setSelectedPriorEducation] = useState<string[]>([]);
  const [usiMode, setUsiMode] = useState<'chooser' | 'usi' | 'exemption'>('chooser');
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    getValues,
  } = useForm<Step2AcademicInfo>({
    defaultValues: {
      avetmissDetails: {
        countryOfBirthId: (formData as any)?.avetmissDetails?.countryOfBirthId ?? '',
        languageAtHomeId: (formData as any)?.avetmissDetails?.languageAtHomeId ?? '',
        indigenousStatusId: (formData as any)?.avetmissDetails?.indigenousStatusId ?? '',
        highestSchoolLevelId: (formData as any)?.avetmissDetails?.highestSchoolLevelId ?? '',
        isAtSchool: (formData as any)?.avetmissDetails?.isAtSchool ?? false,
        hasDisability: (formData as any)?.avetmissDetails?.hasDisability ?? false,
        disabilityTypeIds: (formData as any)?.avetmissDetails?.disabilityTypeIds ?? [],
        hasPriorEducation: (formData as any)?.avetmissDetails?.hasPriorEducation ?? false,
        priorEducationCodes: (formData as any)?.avetmissDetails?.priorEducationCodes ?? [],
        labourForceId: (formData as any)?.avetmissDetails?.labourForceId ?? '',
        surveyContactStatus: (formData as any)?.avetmissDetails?.surveyContactStatus ?? null,
      },
      // @ts-ignore keep USI and CRICOS containers present
      usi: (formData as any)?.usi ?? {},
      // @ts-ignore CRICOS details required when international student
      cricosDetails: (formData as any)?.cricosDetails ?? {},
    },
  });

  // Hydrate when formData changes
  useEffect(() => {
    const a = (formData as any)?.avetmissDetails ?? {};
    setValue('avetmissDetails.countryOfBirthId', a.countryOfBirthId ?? '');
    setValue('avetmissDetails.languageAtHomeId', a.languageAtHomeId ?? '');
    setValue('avetmissDetails.indigenousStatusId', a.indigenousStatusId ?? '');
    setValue('avetmissDetails.highestSchoolLevelId', a.highestSchoolLevelId ?? '');
    setValue('avetmissDetails.isAtSchool', a.isAtSchool ?? false);
    setValue('avetmissDetails.hasDisability', a.hasDisability ?? false);
    setValue('avetmissDetails.disabilityTypeIds', a.disabilityTypeIds ?? []);
    setValue('avetmissDetails.hasPriorEducation', a.hasPriorEducation ?? false);
    setValue('avetmissDetails.priorEducationCodes', a.priorEducationCodes ?? []);
    setValue('avetmissDetails.labourForceId', a.labourForceId ?? '');
    setValue('avetmissDetails.surveyContactStatus', a.surveyContactStatus ?? null);
    // USI / CRICOS
    const usiVal = (formData as any)?.usi ?? {};
    // @ts-ignore
    setValue('usi' as any, usiVal);
    const cricos = (formData as any)?.cricosDetails ?? {};
    // @ts-ignore
    setValue('cricosDetails', cricos);
    // Reflect array-driven checkboxes
    setSelectedDisabilityTypes(a.disabilityTypeIds ?? []);
    setSelectedPriorEducation(a.priorEducationCodes ?? []);
    // Initialize USI mode from payload
    const usi2 = (formData as any)?.usi ?? {};
    if (usi2?.exemptionCode) {
      setUsiMode('exemption');
    } else if (usi2?.usi != null) {
      setUsiMode('usi');
    } else {
      setUsiMode('chooser');
    }
  }, [formData, setValue]);
  
  const watchedValues = watch();
  // Derive Date objects for DatePicker from stored ISO strings
  const passportExpiryDateValue = (() => {
    const v = (watchedValues as any)?.cricosDetails?.passportExpiryDate as string | undefined;
    if (!v) return undefined;
    try { const d = parseISO(v); return isNaN(d.getTime()) ? undefined : d; } catch { return undefined; }
  })();
  const visaExpiryDateValue = (() => {
    const v = (watchedValues as any)?.cricosDetails?.visaExpiryDate as string | undefined;
    if (!v) return undefined;
    try { const d = parseISO(v); return isNaN(d.getTime()) ? undefined : d; } catch { return undefined; }
  })();
  const oshcPaidToDateValue = (() => {
    const v = (watchedValues as any)?.cricosDetails?.oshcPaidToDate as string | undefined;
    if (!v) return undefined;
    try { const d = parseISO(v); return isNaN(d.getTime()) ? undefined : d; } catch { return undefined; }
  })();
  
  // Mark store as dirty when form values change
  useEffect(() => {
    const subscription = watch((value, { name, type }) => {
      if (type === 'change' && name) {
        markDirty();
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, markDirty]);
  
  const onSubmit: SubmitHandler<any> = async (data) => {
    try {
      // Update wizard state
      updateStep2Data(data);
      
      // Move to next step
      nextStep();
      
      // Navigate to step 3
      router.push('/students/new/step-4');
    } catch (error) {
      console.error('Error submitting step 2:', error);
    }
  };
  
  const handleNext = async () => {
    setIsNavigating(true);
    await handleSubmit(onSubmit)();
    setIsNavigating(false);
  };
  
  const handlePrevious = () => {
    previousStep();
    router.push('/students/new/step-2');
  };
  
  const handleDisabilityTypeChange = (typeId: string, checked: boolean) => {
    const newTypes = checked 
      ? [...selectedDisabilityTypes, typeId]
      : selectedDisabilityTypes.filter(id => id !== typeId);
    
    setSelectedDisabilityTypes(newTypes);
    setValue('avetmissDetails.disabilityTypeIds', newTypes);
  };
  
  const handlePriorEducationChange = (code: string, checked: boolean) => {
    const newCodes = checked 
      ? [...selectedPriorEducation, code]
      : selectedPriorEducation.filter(c => c !== code);
    
    setSelectedPriorEducation(newCodes);
    setValue('avetmissDetails.priorEducationCodes', newCodes);
  };
  
  return (
    <div className="min-h-screen bg-background">
      {/* Progress Indicator */}
      <WizardProgress />
      
      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Page Header */}
          <div className="text-center">
            <h1 className="text-3xl font-bold text-foreground">Academic Information</h1>
            <p className="mt-2 text-muted-foreground">
              Please provide the client's academic background and AVETMISS compliance details.
            </p>
          </div>
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* Country and Language Information */}
            <Card>
              <CardHeader>
                <CardTitle>Country and Language</CardTitle>
                <CardDescription>
                  Applicant's country of birth and language information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="countryOfBirth">Country of Birth</Label>
                    <Select value={watchedValues.avetmissDetails?.countryOfBirthId || undefined} onValueChange={(value) => setValue('avetmissDetails.countryOfBirthId', value)}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent className="max-h-64 overflow-auto">
                        {countriesLoading ? (
                          <SelectItem value="loading-countries" disabled>Loading countries...</SelectItem>
                        ) : (
                          countries.map((country) => (
                            <SelectItem key={country.value} value={country.value}>
                              {country.label}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    {errors.avetmissDetails?.countryOfBirthId && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.avetmissDetails.countryOfBirthId.message}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="languageAtHome">Language at Home</Label>
                    <Select value={watchedValues.avetmissDetails?.languageAtHomeId || undefined} onValueChange={(value) => setValue('avetmissDetails.languageAtHomeId', value)}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                      <SelectContent className="max-h-64 overflow-auto">
                        {languagesLoading ? (
                          <SelectItem value="loading-languages" disabled>Loading languages...</SelectItem>
                        ) : (
                          languages.map((language) => (
                            <SelectItem key={language.value} value={language.value}>
                              {language.label}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    {errors.avetmissDetails?.languageAtHomeId && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.avetmissDetails.languageAtHomeId.message}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Indigenous Status */}
            <Card>
              <CardHeader>
                <CardTitle>Indigenous Status</CardTitle>
                <CardDescription>
                  Indicate the applicant's indigenous status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div>
                  <Label htmlFor="indigenousStatus">Indigenous Status</Label>
                  <Select value={watchedValues.avetmissDetails?.indigenousStatusId || undefined} onValueChange={(value) => setValue('avetmissDetails.indigenousStatusId', value)}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select indigenous status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Aboriginal</SelectItem>
                      <SelectItem value="2">Torres Strait Islander</SelectItem>
                      <SelectItem value="3">Both Aboriginal and Torres Strait Islander</SelectItem>
                      <SelectItem value="4">Neither Aboriginal nor Torres Strait Islander</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.avetmissDetails?.indigenousStatusId && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.avetmissDetails.indigenousStatusId.message}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Education Background */}
            <Card>
              <CardHeader>
                <CardTitle>Education Background</CardTitle>
                <CardDescription>
                  Highest school level and current education status for the applicant
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="highestSchoolLevel">Highest School Level</Label>
                    <Select value={watchedValues.avetmissDetails?.highestSchoolLevelId || undefined} onValueChange={(value) => setValue('avetmissDetails.highestSchoolLevelId', value)}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Select school level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="01">Year 8 or below</SelectItem>
                        <SelectItem value="02">Year 9</SelectItem>
                        <SelectItem value="03">Year 10</SelectItem>
                        <SelectItem value="04">Year 11</SelectItem>
                        <SelectItem value="05">Year 12</SelectItem>
                        <SelectItem value="06">Certificate I</SelectItem>
                        <SelectItem value="07">Certificate II</SelectItem>
                        <SelectItem value="08">Certificate III</SelectItem>
                        <SelectItem value="09">Certificate IV</SelectItem>
                        <SelectItem value="10">Diploma</SelectItem>
                        <SelectItem value="11">Advanced Diploma</SelectItem>
                        <SelectItem value="12">Bachelor Degree</SelectItem>
                        <SelectItem value="13">Graduate Certificate</SelectItem>
                        <SelectItem value="14">Graduate Diploma</SelectItem>
                        <SelectItem value="15">Masters Degree</SelectItem>
                        <SelectItem value="16">Doctoral Degree</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.avetmissDetails?.highestSchoolLevelId && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.avetmissDetails.highestSchoolLevelId.message}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="labourForce">Labour Force Status</Label>
                    <Select value={watchedValues.avetmissDetails?.labourForceId || undefined} onValueChange={(value) => setValue('avetmissDetails.labourForceId', value)}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Select labour force status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="01">Employed full-time</SelectItem>
                        <SelectItem value="02">Employed part-time</SelectItem>
                        <SelectItem value="03">Unemployed seeking full-time work</SelectItem>
                        <SelectItem value="04">Unemployed seeking part-time work</SelectItem>
                        <SelectItem value="05">Not in the labour force</SelectItem>
                        <SelectItem value="06">Not stated</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.avetmissDetails?.labourForceId && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.avetmissDetails.labourForceId.message}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isAtSchool"
                    {...register('avetmissDetails.isAtSchool')}
                  />
                  <Label htmlFor="isAtSchool">
                    Currently attending school
                  </Label>
                </div>
              </CardContent>
            </Card>
            
            {/* Disability Information */}
            <Card>
              <CardHeader>
                <CardTitle>Disability Information</CardTitle>
                <CardDescription>
                  Indicate if the applicant has any disabilities
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="hasDisability"
                    {...register('avetmissDetails.hasDisability')}
                  />
                  <Label htmlFor="hasDisability">
                    I have a disability
                  </Label>
                </div>
                
                {watchedValues.avetmissDetails?.hasDisability && (
                  <div>
                    <Label>Disability Types (select all that apply)</Label>
                    <div className="mt-2 space-y-2">
                      {disabilityTypesLoading ? (
                        <p className="text-muted-foreground">Loading disability types...</p>
                      ) : (
                        disabilityTypes.map((type) => (
                          <div key={type.value} className="flex items-center space-x-2">
                            <Checkbox
                              id={`disability-${type.value}`}
                              checked={selectedDisabilityTypes.includes(type.value)}
                              onCheckedChange={(checked) => 
                                handleDisabilityTypeChange(type.value, checked as boolean)
                              }
                            />
                            <Label htmlFor={`disability-${type.value}`}>
                              {type.label}
                            </Label>
                          </div>
                        ))
                      )}
                    </div>
                    
                    {selectedDisabilityTypes.length > 0 && (
                      <div className="mt-2">
                        <Label>Selected Disabilities:</Label>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {selectedDisabilityTypes.map((typeId) => {
                            const type = disabilityTypes.find(t => t.value === typeId);
                            return (
                              <Badge key={typeId} variant="secondary">
                                {type?.description || typeId}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Prior Education */}
            <Card>
              <CardHeader>
                <CardTitle>Prior Education</CardTitle>
                <CardDescription>
                  Indicate if the applicant has any prior education qualifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="hasPriorEducation"
                    {...register('avetmissDetails.hasPriorEducation')}
                  />
                  <Label htmlFor="hasPriorEducation">
                    I have prior education qualifications
                  </Label>
                </div>
                
                {watchedValues.avetmissDetails?.hasPriorEducation && (
                  <div>
                    <Label>Prior Education Qualifications (select all that apply)</Label>
                    <div className="mt-2 space-y-2">
                      {priorEducationLoading ? (
                        <p className="text-muted-foreground">Loading prior education options...</p>
                      ) : (
                        priorEducationOptions.map((option) => (
                          <div key={option.value} className="flex items-center space-x-2">
                            <Checkbox
                              id={`prior-${option.value}`}
                              checked={selectedPriorEducation.includes(option.value)}
                              onCheckedChange={(checked) => 
                                handlePriorEducationChange(option.value, checked as boolean)
                              }
                            />
                            <Label htmlFor={`prior-${option.value}`}>
                              {option.label}
                            </Label>
                          </div>
                        ))
                      )}
                    </div>
                    
                    {selectedPriorEducation.length > 0 && (
                      <div className="mt-2">
                        <Label>Selected Qualifications:</Label>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {selectedPriorEducation.map((code) => {
                            const option = priorEducationOptions.find(o => o.value === code);
                            return (
                              <Badge key={code} variant="secondary">
                                {option?.description || code}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* CRICOS Details (International only) */}
            {formData.isInternationalStudent && (
              <Card>
                <CardHeader>
                  <CardTitle>CRICOS Details</CardTitle>
                  <CardDescription>
                    Required for international students
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="countryOfCitizenshipId">Country of Citizenship (ISO-3)</Label>
                      {/* @ts-ignore */}
                      <Input id="countryOfCitizenshipId" {...register('cricosDetails.countryOfCitizenshipId' as any)} placeholder="e.g., AUS" className="mt-2" />
                    </div>
                    <div>
                      <Label htmlFor="passportNumber">Passport Number</Label>
                      {/* @ts-ignore */}
                      <Input id="passportNumber" {...register('cricosDetails.passportNumber' as any)} placeholder="e.g., N1234567" className="mt-2" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="passportExpiryDate">Passport Expiry Date</Label>
                      {/* @ts-ignore */}
                      <div className="mt-2">
                        <DatePicker
                          id="passportExpiryDate"
                          value={passportExpiryDateValue}
                          onValueChange={(date) => {
                            // @ts-ignore
                            setValue('cricosDetails.passportExpiryDate', date ? format(date, 'yyyy-MM-dd') : undefined);
                          }}
                          placeholder="Pick a date"
                          dateFormat="PPP"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="visaSubclass">Visa Subclass</Label>
                      {/* @ts-ignore */}
                      <Input id="visaSubclass" {...register('cricosDetails.visaSubclass' as any)} placeholder="e.g., 500" className="mt-2" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="visaGrantNumber">Visa Grant Number</Label>
                      {/* @ts-ignore */}
                      <Input id="visaGrantNumber" {...register('cricosDetails.visaGrantNumber' as any)} placeholder="e.g., EGV1234567" className="mt-2" />
                    </div>
                    <div>
                      <Label htmlFor="visaExpiryDate">Visa Expiry Date</Label>
                      {/* @ts-ignore */}
                      <div className="mt-2">
                        <DatePicker
                          id="visaExpiryDate"
                          value={visaExpiryDateValue}
                          onValueChange={(date) => {
                            // @ts-ignore
                            setValue('cricosDetails.visaExpiryDate', date ? format(date, 'yyyy-MM-dd') : undefined);
                          }}
                          placeholder="Pick a date"
                          dateFormat="PPP"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="oshcProvider">OSHC Provider</Label>
                      {/* @ts-ignore */}
                      <Input id="oshcProvider" {...register('cricosDetails.oshcProvider' as any)} placeholder="e.g., Allianz" className="mt-2" />
                    </div>
                    <div>
                      <Label htmlFor="oshcPolicyNumber">OSHC Policy Number</Label>
                      {/* @ts-ignore */}
                      <Input id="oshcPolicyNumber" {...register('cricosDetails.oshcPolicyNumber' as any)} placeholder="e.g., ABC123456" className="mt-2" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="oshcPaidToDate">OSHC Paid To Date</Label>
                      {/* @ts-ignore */}
                      <div className="mt-2">
                        <DatePicker
                          id="oshcPaidToDate"
                          value={oshcPaidToDateValue}
                          onValueChange={(date) => {
                            // @ts-ignore
                            setValue('cricosDetails.oshcPaidToDate', date ? format(date, 'yyyy-MM-dd') : undefined);
                          }}
                          placeholder="Pick a date"
                          dateFormat="PPP"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* USI or Exemption (mutually exclusive) */}
            <Card>
              <CardHeader>
                <CardTitle>Unique Student Identifier (USI)</CardTitle>
                <CardDescription>
                  Provide the applicant's USI or select an exemption reason
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {(() => {
                  const currentUsi = (watchedValues as any)?.usi?.usi as string | undefined;
                  const currentEx = (watchedValues as any)?.usi?.exemptionCode as string | undefined;
                  if (usiMode === 'chooser') {
                    return (
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="secondary" onClick={() => {
                          setUsiMode('usi');
                          // @ts-ignore
                          setValue('usi.exemptionCode' as any, undefined);
                          // @ts-ignore
                          setValue('usi.usi' as any, '');
                          setTimeout(() => document.getElementById('usi')?.focus(), 0);
                        }}>Enter USI</Button>
                        <Button type="button" variant="secondary" onClick={() => {
                          setUsiMode('exemption');
                          // @ts-ignore
                          setValue('usi.usi' as any, undefined);
                          // @ts-ignore
                          setValue('usi.exemptionCode' as any, currentEx || 'IND');
                        }}>Use exemption</Button>
                      </div>
                    );
                  }
                  if (usiMode === 'usi') {
                    return (
                      <div>
                        <Label htmlFor="usi">USI</Label>
                        {/* @ts-ignore */}
                        <Input id="usi" {...register('usi.usi' as any)} placeholder="e.g., 3AW88WHM8G" className="mt-2" onChange={() => {
                          // typing USI clears exemption
                          // @ts-ignore
                          setValue('usi.exemptionCode' as any, undefined);
                          if (usiMode !== 'usi') setUsiMode('usi');
                        }} />
                        <div className="mt-2">
                          <Button type="button" variant="ghost" onClick={() => {
                            // switch to exemption
                            setUsiMode('exemption');
                            // @ts-ignore
                            setValue('usi.usi' as any, undefined);
                            // @ts-ignore
                            setValue('usi.exemptionCode' as any, 'IND');
                          }}>Use exemption instead</Button>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div>
                      <Label htmlFor="usiExemption">USI Exemption</Label>
                      <Select value={(currentEx as any) || undefined} onValueChange={(v) => {
                        if (v === 'none') {
                          setUsiMode('chooser');
                          // @ts-ignore
                          setValue('usi.exemptionCode' as any, undefined);
                          return;
                        }
                        setUsiMode('exemption');
                        // @ts-ignore
                        setValue('usi.usi' as any, undefined);
                        // @ts-ignore
                        setValue('usi.exemptionCode' as any, v as any);
                      }}>
                        <SelectTrigger className="mt-2">
                          <SelectValue placeholder="Select exemption (if applicable)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="IND">Individual Exemption</SelectItem>
                          <SelectItem value="AGR">Agency-Reported Exemption</SelectItem>
                          <SelectItem value="none">None</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="mt-2">
                        <Button type="button" variant="ghost" onClick={() => {
                          // switch to USI
                          setUsiMode('usi');
                          // @ts-ignore
                          setValue('usi.exemptionCode' as any, undefined);
                          // @ts-ignore
                          setValue('usi.usi' as any, '');
                        }}>Enter USI instead</Button>
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
            
            {/* Navigation */}
            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={handlePrevious}>
                Previous Step
              </Button>
              <div className="flex gap-2">
                <SaveDraftButton getFormData={() => getValues()} />
                <LoadingButton type="button" onClick={handleNext} isLoading={isNavigating} loadingText="Next...">
                  Next Step
                </LoadingButton>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
