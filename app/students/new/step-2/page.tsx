'use client';

import { useState } from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
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
import { useAutosave } from '@/hooks/use-autosave';

// =============================================================================
// STEP 2: ACADEMIC INFORMATION
// Matches backend ClientAvetmissDetails schema exactly
// =============================================================================

export default function Step2AcademicInformation() {
  const router = useRouter();
  const { updateStep2Data, nextStep, previousStep, draftId, formData } = useApplicationWizard();
  
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
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<Step2AcademicInfo>({
    defaultValues: {
      avetmissDetails: {
        countryOfBirthId: '',
        languageAtHomeId: '',
        indigenousStatusId: '',
        highestSchoolLevelId: '',
        isAtSchool: false,
        hasDisability: false,
        disabilityTypeIds: [],
        hasPriorEducation: false,
        priorEducationCodes: [],
        labourForceId: '',
        surveyContactStatus: null,
      },
      // @ts-ignore keep USI and CRICOS containers present
      usi: {},
      // @ts-ignore CRICOS details required when international student
      cricosDetails: {},
    },
  });
  
  const watchedValues = watch();

  // Autosave draft (Step 2)
  const { schedule, saveNow } = useAutosave({
    applicationId: draftId || '',
    enabled: Boolean(draftId),
    debounceMs: 1500,
    getPayload: () => {
      const rawUsi = (watchedValues as any).usi || {};
      const normalizedUsi = {
        usi: rawUsi.usi ?? rawUsi.value ?? undefined,
        exemptionCode: rawUsi.exemptionCode ?? rawUsi.exemption ?? undefined,
      };
      return {
        avetmissDetails: watchedValues.avetmissDetails,
        usi: normalizedUsi,
        // @ts-ignore only relevant for international students
        cricosDetails: (watchedValues as any)?.cricosDetails,
      };
    },
  });

  useEffect(() => {
    schedule();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(watchedValues.avetmissDetails)]);
  
  const onSubmit: SubmitHandler<any> = async (data) => {
    try {
      // Update wizard state
      updateStep2Data(data);
      
      // Move to next step
      nextStep();
      
      // Navigate to step 3
      router.push('/students/new/step-3');
    } catch (error) {
      console.error('Error submitting step 2:', error);
    }
  };
  
  const handleNext = async () => {
    await saveNow();
    handleSubmit(onSubmit)();
  };
  
  const handlePrevious = async () => {
    await saveNow();
    previousStep();
    router.push('/students/new/step-1');
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
                    <Select onValueChange={(value) => setValue('avetmissDetails.countryOfBirthId', value)}>
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
                    <Select onValueChange={(value) => setValue('avetmissDetails.languageAtHomeId', value)}>
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
                  <Select onValueChange={(value) => setValue('avetmissDetails.indigenousStatusId', value)}>
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
                    <Select onValueChange={(value) => setValue('avetmissDetails.highestSchoolLevelId', value)}>
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
                    <Select onValueChange={(value) => setValue('avetmissDetails.labourForceId', value)}>
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
                      <Input id="passportNumber" {...register('cricosDetails.passportNumber' as any)} className="mt-2" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="passportExpiryDate">Passport Expiry Date</Label>
                      {/* @ts-ignore */}
                      <Input id="passportExpiryDate" type="date" {...register('cricosDetails.passportExpiryDate' as any)} className="mt-2" />
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
                      <Input id="visaGrantNumber" {...register('cricosDetails.visaGrantNumber' as any)} className="mt-2" />
                    </div>
                    <div>
                      <Label htmlFor="visaExpiryDate">Visa Expiry Date</Label>
                      {/* @ts-ignore */}
                      <Input id="visaExpiryDate" type="date" {...register('cricosDetails.visaExpiryDate' as any)} className="mt-2" />
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
                      <Input id="oshcPolicyNumber" {...register('cricosDetails.oshcPolicyNumber' as any)} className="mt-2" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="oshcPaidToDate">OSHC Paid To Date</Label>
                      {/* @ts-ignore */}
                      <Input id="oshcPaidToDate" type="date" {...register('cricosDetails.oshcPaidToDate' as any)} className="mt-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* USI or Exemption */}
            <Card>
              <CardHeader>
                <CardTitle>Unique Student Identifier (USI)</CardTitle>
                <CardDescription>
                  Provide the applicant's USI or select an exemption reason
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="usi">USI</Label>
                    {/* @ts-ignore */}
                    <Input id="usi" {...register('usi.usi' as any)} placeholder="e.g., 3AW88WHM8G" className="mt-2" />
                  </div>
                  <div>
                    <Label htmlFor="usiExemption">USI Exemption</Label>
                    <Select onValueChange={(v) => {
                      if (v === 'none') {
                        // @ts-ignore
                        setValue('usi.exemptionCode' as any, undefined);
                        return;
                      }
                      // @ts-ignore
                      setValue('usi.exemptionCode' as any, v as any);
                    }}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Select exemption (if applicable)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="IND">Individual Exemption</SelectItem>
                        <SelectItem value="AGR">Agency-Reported Exemption</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Navigation */}
            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={handlePrevious}>
                Previous Step
              </Button>
              <Button type="button" onClick={handleNext}>
                Next Step
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
