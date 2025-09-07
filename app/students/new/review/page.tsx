'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { WizardProgress } from '../components/wizard-progress';
import { useApplicationWizard } from '@/stores/application-wizard';
import { usePatchApplication, useSubmitApplication } from '@/hooks/use-application-api';
import { toast } from 'sonner';
import { usePrograms, useCourseOfferings, useProgramSubjects } from '@/hooks/use-programs';
import { useLocations } from '@/hooks/use-locations';
import { useFundingSources, useStudyReasons } from '@/hooks/use-reference-data';

export default function ReviewApplication() {
  const router = useRouter();
  const { draftId, formData, previousStep, resetWizard } = useApplicationWizard();
  const { mutateAsync: submit, isPending } = useSubmitApplication(draftId || '');
  const { mutateAsync: patch } = usePatchApplication(draftId || '');

  // Fetch labels to map IDs
  const programId = formData.enrolmentDetails?.programId || '';
  const offeringId = formData.enrolmentDetails?.courseOfferingId || '';
  const locationId = formData.enrolmentDetails?.deliveryLocationId || '';
  const { data: programsRes } = usePrograms();
  const { data: offeringsRes } = useCourseOfferings(programId);
  const { data: locationsRes } = useLocations();
  const { data: fundingRes } = useFundingSources();
  const { data: reasonsRes } = useStudyReasons();

  const findProgramName = () => {
    const p: any = programsRes?.data?.find((x: any) => (x.id ?? x.program_id) === programId);
    return p?.program_name ?? p?.name ?? programId;
  };
  const findOfferingLabel = () => {
    const o: any = offeringsRes?.data?.find((x: any) => (x.id ?? x.offering_id) === offeringId);
    if (!o) return offeringId;
    const start = (o.start_date ?? o.startDate) as string;
    const end = (o.end_date ?? o.endDate) as string;
    return `${new Date(start).toLocaleDateString()} – ${new Date(end).toLocaleDateString()}`;
  };
  const findLocationName = () => locationsRes?.find(l => l.id === locationId)?.name || locationId;
  const findFundingLabel = () => (fundingRes as any)?.data?.find((f: any) => f.code === formData.enrolmentDetails?.fundingSourceId)?.description || formData.enrolmentDetails?.fundingSourceId || '';
  const findReasonLabel = () => (reasonsRes as any)?.data?.find((r: any) => r.code === formData.enrolmentDetails?.studyReasonId)?.description || formData.enrolmentDetails?.studyReasonId || '';

  const missingFields: string[] = [];
  if (!formData.personalDetails) missingFields.push('Personal details');
  if (!formData.address) missingFields.push('Address');
  if (!formData.enrolmentDetails?.programId) missingFields.push('Program');
  if (!formData.enrolmentDetails?.courseOfferingId) missingFields.push('Course offering');
  if (!formData.enrolmentDetails?.subjectStructure?.coreSubjectIds?.length) missingFields.push('Core subjects');
  if (!formData.enrolmentDetails?.deliveryLocationId) missingFields.push('Delivery location');
  if (!formData.enrolmentDetails?.fundingSourceId) missingFields.push('Funding source');
  if (!formData.enrolmentDetails?.studyReasonId) missingFields.push('Study reason');
  const usiObj: any = (formData as any).usi || {};
  if (!usiObj.usi && !usiObj.exemptionCode) missingFields.push('USI or exemption');
  if ((formData as any).isInternationalStudent) {
    const c = (formData as any).cricosDetails || {};
    if (!c.countryOfCitizenshipId || !c.passportNumber || !c.passportExpiryDate) missingFields.push('CRICOS details');
  }

  const missingCount = missingFields.length;

  const getFirstMissingStepPath = () => {
    for (const item of missingFields) {
      if (item === 'Personal details' || item === 'Address') return '/students/new/step-1';
      if (item === 'USI or exemption' || item === 'CRICOS details') return '/students/new/step-2';
      if (
        item === 'Program' ||
        item === 'Course offering' ||
        item === 'Core subjects' ||
        item === 'Delivery location' ||
        item === 'Funding source' ||
        item === 'Study reason'
      ) return '/students/new/step-3';
    }
    return '/students/new/step-1';
  };

  useEffect(() => {
    if (!draftId) {
      router.replace('/students/new');
    }
  }, [draftId, router]);

  const handleSubmit = async () => {
    if (!draftId) return;
    try {
      toast.loading('Submitting application…', { id: 'submit' });
      // Normalize keys and codes expected by backend
      const rawPersonal = formData.personalDetails as any;
      const genderMap: Record<string, string> = { Male: 'M', Female: 'F', Other: 'X' };
      const normalizedPersonal = rawPersonal
        ? {
            ...rawPersonal,
            gender: genderMap[rawPersonal.gender] ?? rawPersonal.gender,
            mobilePhone: rawPersonal.mobilePhone ?? rawPersonal.primaryPhone,
          }
        : undefined;
      const rawUsi = (formData as any)?.usi || {};
      const normalizedUsi = {
        usi: rawUsi.usi ?? rawUsi.value ?? undefined,
        exemptionCode: rawUsi.exemptionCode ?? rawUsi.exemption ?? undefined,
      };
      await patch({
        isInternationalStudent: Boolean((formData as any)?.isInternationalStudent ?? false),
        personalDetails: normalizedPersonal,
        address: formData.address,
        avetmissDetails: formData.avetmissDetails,
        enrolmentDetails: formData.enrolmentDetails,
        usi: normalizedUsi,
      });
      await submit();
      // Cleanup persisted wizard state and related localStorage keys
      try {
        if (typeof window !== 'undefined') {
          // Remove ETag and autosave queue for this draft
          if (draftId) {
            window.localStorage.removeItem(`app-etag:${draftId}`);
            window.localStorage.removeItem(`autosave-queue:${draftId}`);
          }
          // Remove persisted wizard store
          window.localStorage.removeItem('application-wizard-storage');
        }
      } catch {}
      resetWizard();
      toast.success('Application submitted', { id: 'submit' });
      router.replace('/students/new');
    } catch (err: any) {
      toast.error('Submission failed — please complete all required details and try again.', { id: 'submit' });
    }
  };

  const handleBack = () => {
    previousStep();
    router.push('/students/new/step-5');
  };

  return (
    <div className="min-h-screen bg-background">
      <WizardProgress />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-foreground">Review & Submit</h1>
            <p className="mt-2 text-muted-foreground">
              Please verify details before submitting{missingCount > 0 ? ` — ${missingCount} section${missingCount > 1 ? 's' : ''} incomplete` : ''}.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Personal Details</CardTitle>
              <CardDescription>From Step 1</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SummaryRow label="Name" value={`${formData.personalDetails?.firstName ?? ''} ${formData.personalDetails?.lastName ?? ''}`.trim()} />
              <SummaryRow label="DOB" value={formData.personalDetails?.dateOfBirth} />
              <SummaryRow label="Email" value={formData.personalDetails?.primaryEmail} />
              <SummaryRow label="Phone" value={formData.personalDetails?.primaryPhone} />
              <SummaryRow label="Gender" value={formData.personalDetails?.gender} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Address</CardTitle>
              <CardDescription>From Step 1</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SummaryRow label="Residential" value={`${formData.address?.residential?.streetNumber ?? ''} ${formData.address?.residential?.streetName ?? ''}, ${formData.address?.residential?.suburb ?? ''} ${formData.address?.residential?.state ?? ''} ${formData.address?.residential?.postcode ?? ''}`.trim()} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>AVETMISS</CardTitle>
              <CardDescription>From Step 2</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SummaryRow label="Country of Birth" value={formData.avetmissDetails?.countryOfBirthId} />
              <SummaryRow label="Language at Home" value={formData.avetmissDetails?.languageAtHomeId} />
              <SummaryRow label="Indigenous Status" value={formData.avetmissDetails?.indigenousStatusId} />
              <SummaryRow label="Highest School Level" value={formData.avetmissDetails?.highestSchoolLevelId} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Enrolment</CardTitle>
              <CardDescription>From Step 3</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SummaryRow label="Program" value={findProgramName()} />
              <SummaryRow label="Course Offering" value={findOfferingLabel()} />
              <SummaryRow label="Start Date" value={formData.enrolmentDetails?.startDate} />
              <SummaryRow label="Expected Completion" value={formData.enrolmentDetails?.expectedCompletionDate} />
              <SummaryRow label="Delivery Location" value={findLocationName()} />
              <SummaryRow label="Funding Source" value={findFundingLabel()} />
              <SummaryRow label="Study Reason" value={findReasonLabel()} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Financial</CardTitle>
              <CardDescription>From Step 5</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SummaryRow label="Payment Plan" value={String((formData as any).paymentPlan ?? '')} />
              <SummaryRow label="Tuition Fee" value={(formData as any).tuitionFeeSnapshot != null ? `$${Number((formData as any).tuitionFeeSnapshot).toFixed(2)}` : ''} />
              <SummaryRow label="Payment Method" value={String((formData as any).paymentMethod ?? '')} />
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button type="button" variant="outline" onClick={handleBack} aria-label="Go back to previous step">Back</Button>
            <div className="flex items-center gap-3">
              {missingCount > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push(getFirstMissingStepPath())}
                  aria-label="Jump to first incomplete section"
                >
                  Go to first incomplete
                </Button>
              )}
              <Button type="button" onClick={handleSubmit} disabled={isPending} aria-label="Submit application">Submit Application</Button>
            </div>
          </div>

          {missingFields.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Missing Information</CardTitle>
                <CardDescription>Complete these before approval:</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="list-disc pl-6 text-sm text-muted-foreground">
                  {missingFields.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value?: string | number | null }) {
  const display = value == null || value === '' ? '—' : String(value);
  return (
    <div className="flex items-center justify-between rounded border border-border p-3 bg-card">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{display}</span>
    </div>
  );
}


