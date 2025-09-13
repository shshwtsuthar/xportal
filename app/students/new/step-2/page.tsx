'use client';

import { useState, useEffect } from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { WizardProgress } from '../components/wizard-progress';
import { useApplicationWizard } from '@/stores/application-wizard';
import { Step1PersonalInfoSchema, Step1PersonalInfo } from '@/lib/schemas/application-schemas';
import { useAutosave } from '@/hooks/use-autosave';
import { useDocumentUpload } from '@/hooks/use-document-upload';
 
// =============================================================================
// STEP 1: PERSONAL INFORMATION
// Matches backend ClientPersonalDetails and ClientAddress schemas exactly
// =============================================================================

export default function Step1PersonalInformation() {
  const router = useRouter();
  const { updateStep1Data, updateFormData, nextStep, markDirty, draftId, formData } = useApplicationWizard();
  const [isInternationalStudent, setIsInternationalStudent] = useState<boolean>(Boolean(formData?.isInternationalStudent));
  const [isPostalSameAsResidential, setIsPostalSameAsResidential] = useState<boolean>(
    formData?.address?.isPostalSameAsResidential ?? true
  );
  
  // Get passport processing data
  const { lastExtractedData } = useDocumentUpload(draftId || '');
  
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    watch,
    setValue,
  } = useForm<Step1PersonalInfo>({
    defaultValues: {
      personalDetails: {
        title: (formData?.personalDetails as any)?.title ?? '',
        firstName: (formData?.personalDetails as any)?.firstName ?? '',
        lastName: (formData?.personalDetails as any)?.lastName ?? '',
        dateOfBirth: (formData?.personalDetails as any)?.dateOfBirth ?? '',
        gender: (formData?.personalDetails as any)?.gender ?? (undefined as unknown as 'Male' | 'Female' | 'Other' | undefined),
        primaryEmail: (formData?.personalDetails as any)?.primaryEmail ?? '',
        primaryPhone: (formData?.personalDetails as any)?.primaryPhone ?? '',
      },
      address: {
        residential: {
          streetNumber: (formData?.address as any)?.residential?.streetNumber ?? '',
          streetName: (formData?.address as any)?.residential?.streetName ?? '',
          unitDetails: (formData?.address as any)?.residential?.unitDetails ?? '',
          buildingName: (formData?.address as any)?.residential?.buildingName ?? '',
          suburb: (formData?.address as any)?.residential?.suburb ?? '',
          state: (formData?.address as any)?.residential?.state ?? (undefined as unknown as 'SA' | 'VIC' | 'NSW' | 'QLD' | 'WA' | 'TAS' | 'NT' | 'ACT' | undefined),
          postcode: (formData?.address as any)?.residential?.postcode ?? '',
        },
        isPostalSameAsResidential: (formData?.address as any)?.isPostalSameAsResidential ?? true,
        postal: (formData?.address as any)?.postal ?? undefined,
      },
      emergencyContact: (formData as any)?.emergencyContact ?? {
        name: '',
        relationship: '',
        phone: '',
        email: '',
      },
    },
  });

  // Hydrate form when formData changes (e.g., after loadDraft)
  useEffect(() => {
    const pd = (formData?.personalDetails as any) ?? {};
    const addr = (formData?.address as any) ?? {};
    const resi = addr.residential ?? {};
    const emc = (formData as any)?.emergencyContact ?? {};
    setIsInternationalStudent(Boolean(formData?.isInternationalStudent));
    setIsPostalSameAsResidential(addr.isPostalSameAsResidential ?? true);
    setValue('personalDetails.title', pd.title ?? '');
    setValue('personalDetails.firstName', pd.firstName ?? '');
    setValue('personalDetails.lastName', pd.lastName ?? '');
    setValue('personalDetails.dateOfBirth', pd.dateOfBirth ?? '');
    setValue('personalDetails.gender', (pd.gender as any) ?? undefined);
    setValue('personalDetails.primaryEmail', pd.primaryEmail ?? '');
    setValue('personalDetails.primaryPhone', pd.primaryPhone ?? '');
    setValue('address.residential.streetNumber', resi.streetNumber ?? '');
    setValue('address.residential.streetName', resi.streetName ?? '');
    setValue('address.residential.unitDetails', resi.unitDetails ?? '');
    setValue('address.residential.buildingName', resi.buildingName ?? '');
    setValue('address.residential.suburb', resi.suburb ?? '');
    setValue('address.residential.state', resi.state ?? undefined);
    setValue('address.residential.postcode', resi.postcode ?? '');
    setValue('address.isPostalSameAsResidential', addr.isPostalSameAsResidential ?? true);
    if (addr.postal) {
      setValue('address.postal', addr.postal);
    }
    setValue('emergencyContact.name', emc.name ?? '');
    setValue('emergencyContact.relationship', emc.relationship ?? '');
    setValue('emergencyContact.phone', emc.phone ?? '');
    setValue('emergencyContact.email', emc.email ?? '');
  }, [formData, setValue]);
  
  // Watch for changes to mark form as dirty
  const watchedValues = watch();

  // Autosave draft (Step 1)
  const { schedule, saveNow } = useAutosave({
    applicationId: draftId || '',
    enabled: Boolean(draftId),
    debounceMs: 1500,
    getPayload: () => ({
      isInternationalStudent,
      personalDetails: watchedValues.personalDetails,
      address: watchedValues.address,
      emergencyContact: watchedValues.emergencyContact,
    }),
  });

  useEffect(() => {
    schedule();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    JSON.stringify(watchedValues.personalDetails),
    JSON.stringify(watchedValues.address),
    JSON.stringify(watchedValues.emergencyContact),
    isInternationalStudent,
  ]);
  
  const onSubmit: SubmitHandler<Step1PersonalInfo> = async (data) => {
    try {
      // Update wizard state
      updateStep1Data(data);
      
      // Move to next step
      nextStep();
      
      // Navigate to step 2
      router.push('/students/new/step-3');
    } catch (error) {
      console.error('Error submitting step 1:', error);
    }
  };
  
  const handleNext = async () => {
    await saveNow();
    handleSubmit(onSubmit)();
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
            <h1 className="text-3xl font-bold text-foreground">Personal Information</h1>
            <p className="mt-2 text-muted-foreground">
              Please provide the client's personal details and contact information.
            </p>
          </div>
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* Personal Details */}
            <Card>
              <CardHeader>
                <CardTitle>Personal Details</CardTitle>
                <CardDescription>
                  Applicant's basic personal information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="title">Title</Label>
                    <Select value={watch('personalDetails.title') || undefined} onValueChange={(value) => setValue('personalDetails.title', value)}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Select title" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Mr">Mr</SelectItem>
                        <SelectItem value="Ms">Ms</SelectItem>
                        <SelectItem value="Mrs">Mrs</SelectItem>
                        <SelectItem value="Dr">Dr</SelectItem>
                        <SelectItem value="Prof">Prof</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="firstName" className="flex items-center gap-2">
                      First Name
                      {lastExtractedData?.firstName && (
                        <span className="text-green-600" title="Auto-filled from passport">✅</span>
                      )}
                    </Label>
                    <Input
                      id="firstName"
                      {...register('personalDetails.firstName')}
                      className={(errors.personalDetails?.firstName ? 'border-red-500 ' : '') + 'mt-2'}
                    />
                    {errors.personalDetails?.firstName && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.personalDetails.firstName.message}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="lastName" className="flex items-center gap-2">
                      Last Name
                      {lastExtractedData?.lastName && (
                        <span className="text-green-600" title="Auto-filled from passport">✅</span>
                      )}
                    </Label>
                    <Input
                      id="lastName"
                      {...register('personalDetails.lastName')}
                      className={(errors.personalDetails?.lastName ? 'border-red-500 ' : '') + 'mt-2'}
                    />
                    {errors.personalDetails?.lastName && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.personalDetails.lastName.message}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="dateOfBirth" className="flex items-center gap-2">
                      Date of Birth
                      {lastExtractedData?.dateOfBirth && (
                        <span className="text-green-600" title="Auto-filled from passport">✅</span>
                      )}
                    </Label>
                    <Input
                      id="dateOfBirth"
                      type="date"
                      {...register('personalDetails.dateOfBirth')}
                      placeholder="YYYY-MM-DD"
                      aria-label="Date of birth"
                      className={(errors.personalDetails?.dateOfBirth ? 'border-red-500 ' : '') + 'mt-2'}
                    />
                    {errors.personalDetails?.dateOfBirth && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.personalDetails.dateOfBirth.message}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="gender" className="flex items-center gap-2">
                      Gender
                      {lastExtractedData?.gender && (
                        <span className="text-green-600" title="Auto-filled from passport">✅</span>
                      )}
                    </Label>
                    <Select value={watch('personalDetails.gender') || undefined} onValueChange={(value) => setValue('personalDetails.gender', value as 'Male' | 'Female' | 'Other')}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.personalDetails?.gender && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.personalDetails.gender.message}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="primaryEmail">Email Address</Label>
                    <Input
                      id="primaryEmail"
                      type="email"
                      {...register('personalDetails.primaryEmail')}
                      placeholder="name@example.com"
                      aria-label="Email address"
                      className={(errors.personalDetails?.primaryEmail ? 'border-red-500 ' : '') + 'mt-2'}
                    />
                    {errors.personalDetails?.primaryEmail && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.personalDetails.primaryEmail.message}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="primaryPhone">Phone Number</Label>
                    <Input
                      id="primaryPhone"
                      type="tel"
                      {...register('personalDetails.primaryPhone')}
                      placeholder="e.g., 0400 000 000"
                      aria-label="Phone number"
                      pattern="^0\\\d{9}$"
                      title="Enter a 10-digit Australian number starting with 0"
                      className={(errors.personalDetails?.primaryPhone ? 'border-red-500 ' : '') + 'mt-2'}
                    />
                    {errors.personalDetails?.primaryPhone && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.personalDetails.primaryPhone.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isInternationalStudent"
                    checked={isInternationalStudent}
                    onCheckedChange={(checked) => {
                      const value = Boolean(checked);
                      setIsInternationalStudent(value);
                      updateFormData({ isInternationalStudent: value });
                    }}
                  />
                  <Label htmlFor="isInternationalStudent">International student</Label>
                </div>
              </CardContent>
            </Card>
            
            {/* Residential Address */}
            <Card>
              <CardHeader>
                <CardTitle>Residential Address</CardTitle>
                <CardDescription>
                  Applicant's primary residential address
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="streetNumber">Street Number</Label>
                    <Input
                      id="streetNumber"
                      {...register('address.residential.streetNumber')}
                      className={(errors.address?.residential?.streetNumber ? 'border-red-500 ' : '') + 'mt-2'}
                    />
                    {errors.address?.residential?.streetNumber && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.address.residential.streetNumber.message}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="streetName">Street Name</Label>
                    <Input
                      id="streetName"
                      {...register('address.residential.streetName')}
                      className={(errors.address?.residential?.streetName ? 'border-red-500 ' : '') + 'mt-2'}
                    />
                    {errors.address?.residential?.streetName && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.address.residential.streetName.message}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="unitDetails">Unit Details</Label>
                    <Input
                      id="unitDetails"
                      {...register('address.residential.unitDetails')}
                      placeholder="e.g., Unit 5, Apartment 10B"
                      className="mt-2"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="buildingName">Building Name</Label>
                    <Input
                      id="buildingName"
                      {...register('address.residential.buildingName')}
                      placeholder="e.g., Building name, homestead"
                      className="mt-2"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="suburb">Suburb</Label>
                    <Input
                      id="suburb"
                      {...register('address.residential.suburb')}
                      className={(errors.address?.residential?.suburb ? 'border-red-500 ' : '') + 'mt-2'}
                    />
                    {errors.address?.residential?.suburb && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.address.residential.suburb.message}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="state">State</Label>
                    <Select value={watch('address.residential.state') || undefined} onValueChange={(value) => setValue('address.residential.state', value as any)}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="VIC">Victoria</SelectItem>
                        <SelectItem value="NSW">New South Wales</SelectItem>
                        <SelectItem value="QLD">Queensland</SelectItem>
                        <SelectItem value="SA">South Australia</SelectItem>
                        <SelectItem value="WA">Western Australia</SelectItem>
                        <SelectItem value="TAS">Tasmania</SelectItem>
                        <SelectItem value="NT">Northern Territory</SelectItem>
                        <SelectItem value="ACT">Australian Capital Territory</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.address?.residential?.state && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.address.residential.state.message}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="postcode">Postcode</Label>
                    <Input
                      id="postcode"
                      {...register('address.residential.postcode')}
                      placeholder="e.g., 3000"
                      aria-label="Residential postcode"
                      pattern="^\\\d{4}$"
                      title="Enter a 4-digit postcode"
                      className={(errors.address?.residential?.postcode ? 'border-red-500 ' : '') + 'mt-2'}
                    />
                    {errors.address?.residential?.postcode && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.address.residential.postcode.message}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Postal Address */}
            <Card>
              <CardHeader>
                <CardTitle>Postal Address</CardTitle>
                <CardDescription>
                  Applicant's postal address (if different from residential)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isPostalSameAsResidential"
                    checked={isPostalSameAsResidential}
                    onCheckedChange={(checked) => {
                      setIsPostalSameAsResidential(checked as boolean);
                      setValue('address.isPostalSameAsResidential', checked as boolean);
                    }}
                  />
                  <Label htmlFor="isPostalSameAsResidential">
                    Same as residential address
                  </Label>
                </div>
                
                {!isPostalSameAsResidential && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="postalStreetNumber">Street Number *</Label>
                        <Input
                          id="postalStreetNumber"
                          {...register('address.postal.streetNumber')}
                          className={(errors.address?.postal?.streetNumber ? 'border-red-500' : '') + 'mt-2'}
                        />
                        {errors.address?.postal?.streetNumber && (
                          <p className="text-red-500 text-sm mt-1">
                            {errors.address.postal.streetNumber.message}
                          </p>
                        )}
                      </div>
                      
                      <div>
                        <Label htmlFor="postalStreetName">Street Name *</Label>
                        <Input
                          id="postalStreetName"
                          {...register('address.postal.streetName')}
                          className={(errors.address?.postal?.streetName ? 'border-red-500' : '') + 'mt-2'}
                        />
                        {errors.address?.postal?.streetName && (
                          <p className="text-red-500 text-sm mt-1">
                            {errors.address.postal.streetName.message}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="postalSuburb">Suburb *</Label>
                        <Input
                          id="postalSuburb"
                          {...register('address.postal.suburb')}
                          className={(errors.address?.postal?.suburb ? 'border-red-500' : '') + 'mt-2'}
                        />
                        {errors.address?.postal?.suburb && (
                          <p className="text-red-500 text-sm mt-1">
                            {errors.address.postal.suburb.message}
                          </p>
                        )}
                      </div>
                      
                      <div>
                        <Label htmlFor="postalState">State *</Label>
                        <Select onValueChange={(value) => setValue('address.postal.state', value as any)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select state" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="VIC">Victoria</SelectItem>
                            <SelectItem value="NSW">New South Wales</SelectItem>
                            <SelectItem value="QLD">Queensland</SelectItem>
                            <SelectItem value="SA">South Australia</SelectItem>
                            <SelectItem value="WA">Western Australia</SelectItem>
                            <SelectItem value="TAS">Tasmania</SelectItem>
                            <SelectItem value="NT">Northern Territory</SelectItem>
                            <SelectItem value="ACT">Australian Capital Territory</SelectItem>
                          </SelectContent>
                        </Select>
                        {errors.address?.postal?.state && (
                          <p className="text-red-500 text-sm mt-1">
                            {errors.address.postal.state.message}
                          </p>
                        )}
                      </div>
                      
                      <div>
                        <Label htmlFor="postalPostcode">Postcode *</Label>
                        <Input
                          id="postalPostcode"
                          {...register('address.postal.postcode')}
                          placeholder="e.g., 3000"
                          aria-label="Postal postcode"
                          pattern="^\\\d{4}$"
                          title="Enter a 4-digit postcode"
                          className={(errors.address?.postal?.postcode ? 'border-red-500' : '') + 'mt-2'}
                        />
                        {errors.address?.postal?.postcode && (
                          <p className="text-red-500 text-sm mt-1">
                            {errors.address.postal.postcode.message}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Emergency Contact */}
            <Card>
              <CardHeader>
                <CardTitle>Emergency Contact</CardTitle>
                <CardDescription>
                  Someone we can contact in case of emergency
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="emergencyName">Contact Name</Label>
                    <Input
                      id="emergencyName"
                      {...register('emergencyContact.name')}
                      className={(errors.emergencyContact?.name ? 'border-red-500 ' : '') + 'mt-2'}
                    />
                    {errors.emergencyContact?.name && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.emergencyContact.name.message}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="emergencyRelationship">Relationship</Label>
                    <Input
                      id="emergencyRelationship"
                      {...register('emergencyContact.relationship')}
                      className={(errors.emergencyContact?.relationship ? 'border-red-500 ' : '') + 'mt-2'}
                    />
                    {errors.emergencyContact?.relationship && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.emergencyContact.relationship.message}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="emergencyPhone">Phone Number</Label>
                    <Input
                      id="emergencyPhone"
                      type="tel"
                      {...register('emergencyContact.phone')}
                      className={(errors.emergencyContact?.phone ? 'border-red-500 ' : '') + 'mt-2'}
                    />
                    {errors.emergencyContact?.phone && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.emergencyContact.phone.message}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="emergencyEmail">Email Address</Label>
                    <Input
                      id="emergencyEmail"
                      type="email"
                      {...register('emergencyContact.email')}
                      className={(errors.emergencyContact?.email ? 'border-red-500 ' : '') + 'mt-2'}
                    />
                    {errors.emergencyContact?.email && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.emergencyContact.email.message}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Navigation */}
            <div className="flex justify-end">
              <Button type="button" onClick={handleNext} className="px-8">
                Next Step
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
