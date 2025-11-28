'use client';

import { use, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CopyToClipboardBadge } from '@/components/ui/copy-to-clipboard-badge';
import { Mail } from 'lucide-react';
import { useComposeEmail } from '@/components/providers/compose-email';
import { useGetStudentById } from '@/src/hooks/useGetStudentById';
import { useGetStudentAddresses } from '@/src/hooks/useGetStudentAddresses';
import { useGetStudentAvetmiss } from '@/src/hooks/useGetStudentAvetmiss';
import { useGetStudentCricos } from '@/src/hooks/useGetStudentCricos';
import { useGetStudentContacts } from '@/src/hooks/useGetStudentContacts';
import { useGetStudentDisabilities } from '@/src/hooks/useGetStudentDisabilities';
import { useGetStudentPriorEducation } from '@/src/hooks/useGetStudentPriorEducation';
import { CourseProgressionCard } from './CourseProgressionCard';
import { FinancePane } from '../[id]/_components/FinancePane';
import { StudentDocumentsPane } from './StudentDocumentsPane';
import { AssignmentsPane } from './AssignmentsPane';
import { StudentAttendanceTable } from './StudentAttendanceTable';
import { StudentAnnouncementsCard } from './StudentAnnouncementsCard';
import { useStudentDashboardMetrics } from '@/src/hooks/useStudentDashboardMetrics';
import { useGetStudentEnrollmentSubjects } from '@/src/hooks/useGetStudentEnrollmentSubjects';
import { Pie, PieChart } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';

type StudentDashboardMode = 'staff' | 'student';

type StudentDashboardPageClientProps = {
  params?: Promise<{ id: string }>;
  studentIdDisplay?: string;
  mode?: StudentDashboardMode;
  welcomeNameOverride?: string | null;
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

export function StudentDashboardPageClient({
  params,
  studentIdDisplay: directStudentIdDisplay,
  mode = 'staff',
  welcomeNameOverride,
}: StudentDashboardPageClientProps) {
  const { id: paramStudentIdDisplay } = params
    ? use(params)
    : { id: undefined };
  const studentIdDisplay =
    directStudentIdDisplay ?? paramStudentIdDisplay ?? '';

  const [activeTab, setActiveTab] = useState(0);
  const { openWithRecipients } = useComposeEmail();

  const {
    data: student,
    isLoading,
    isError,
  } = useGetStudentById(studentIdDisplay);

  const studentUuid = student?.id;
  const { data: addresses } = useGetStudentAddresses(studentUuid ?? '');
  const { data: avetmiss } = useGetStudentAvetmiss(studentUuid ?? '');
  const { data: cricos } = useGetStudentCricos(studentUuid ?? '');
  const { data: contacts } = useGetStudentContacts(studentUuid ?? '');
  const { data: disabilities = [] } = useGetStudentDisabilities(
    studentUuid ?? ''
  );
  const metrics = useStudentDashboardMetrics(studentUuid);
  const { data: priorEducation = [] } = useGetStudentPriorEducation(
    studentUuid ?? ''
  );
  const { data: enrollmentSubjects = [] } =
    useGetStudentEnrollmentSubjects(studentUuid);

  // Calculate pie chart data for evaluation statuses
  const evaluationStatusData = useMemo(() => {
    const competent = enrollmentSubjects.filter(
      (s) => s.outcome_code === 'C'
    ).length;
    const notYetCompetent = enrollmentSubjects.filter(
      (s) => s.outcome_code === 'NYC'
    ).length;
    const notAssessed = enrollmentSubjects.filter(
      (s) => s.outcome_code === null || s.outcome_code === undefined
    ).length;

    return [
      {
        status: 'Competent',
        count: competent,
        fill: 'var(--chart-1)',
      },
      {
        status: 'Not Yet Competent',
        count: notYetCompetent,
        fill: 'var(--chart-2)',
      },
      {
        status: 'Not Yet Assessed',
        count: notAssessed,
        fill: 'var(--chart-3)',
      },
    ];
  }, [enrollmentSubjects]);

  const evaluationChartConfig = {
    count: {
      label: 'Units',
    },
    Competent: {
      label: 'Competent',
      color: 'var(--chart-1)',
    },
    'Not Yet Competent': {
      label: 'Not Yet Competent',
      color: 'var(--chart-2)',
    },
    'Not Yet Assessed': {
      label: 'Not Yet Assessed',
      color: 'var(--chart-3)',
    },
  } satisfies ChartConfig;

  const postalSameAsStreet = useMemo(() => {
    if (!addresses || addresses.length < 2) return false;
    const street = addresses.find((a) => a.type === 'street');
    const postal = addresses.find((a) => a.type === 'postal');
    return !postal && street !== undefined;
  }, [addresses]);

  const age = useMemo(() => {
    if (!student?.date_of_birth) return null;
    const dob = new Date(student.date_of_birth);
    if (isNaN(dob.getTime())) return null;
    const today = new Date();
    let ageYears = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      ageYears--;
    }
    return ageYears;
  }, [student?.date_of_birth]);

  const showVSN = useMemo(() => {
    if (!avetmiss || !addresses) return false;
    const streetAddress = addresses.find((a) => a.type === 'street');
    return (
      streetAddress?.state === 'VIC' &&
      age !== null &&
      age < 25 &&
      cricos?.is_international === false
    );
  }, [avetmiss, addresses, age, cricos]);

  const staffTabs = [
    { key: 'details', label: 'Details' as const },
    { key: 'course', label: 'Course Progression' as const },
    { key: 'documents', label: 'Documents' as const },
    { key: 'assignments', label: 'Assignments' as const },
    { key: 'finance', label: 'Finance' as const },
    { key: 'attendance', label: 'Attendance' as const },
  ];

  const studentTabs = staffTabs.filter(
    (tab) => tab.key !== 'details' && tab.key !== 'documents'
  );

  const tabs = mode === 'student' ? studentTabs : staffTabs;

  if (isLoading) {
    return <p className="text-muted-foreground text-sm">Loading…</p>;
  }

  if (isError || !student) {
    return <p className="text-destructive text-sm">Failed to load student.</p>;
  }

  const fullName = [
    student.salutation,
    student.first_name,
    student.middle_name,
    student.last_name,
  ]
    .filter(Boolean)
    .join(' ');

  const displayWelcomeName =
    welcomeNameOverride && welcomeNameOverride.trim().length > 0
      ? welcomeNameOverride
      : fullName || student.preferred_name || student.first_name;

  const formatGender = (gender: string | null | undefined) => {
    if (!gender) return '—';
    const map: Record<string, string> = {
      M: 'Male',
      F: 'Female',
      X: 'Non-Binary / X',
      '@': 'Not Stated',
    };
    return map[gender] || gender;
  };

  const formatIndigenousStatus = (status: string | null | undefined) => {
    if (!status) return '—';
    const map: Record<string, string> = {
      '1': 'Aboriginal',
      '2': 'Torres Strait Islander',
      '3': 'Both Aboriginal and Torres Strait Islander',
      '4': 'Neither',
      '9': 'Not stated',
    };
    return map[status] || status;
  };

  const formatHighestSchoolLevel = (level: string | null | undefined) => {
    if (!level) return '—';
    const map: Record<string, string> = {
      '08': 'Year 12 or equivalent',
      '09': 'Year 11 or equivalent',
      '10': 'Year 10 or equivalent',
      '11': 'Year 9 or equivalent',
      '12': 'Year 8 or below',
      '02': 'Did not go to school',
    };
    return map[level] || level;
  };

  const formatLabourForceStatus = (status: string | null | undefined) => {
    if (!status) return '—';
    const map: Record<string, string> = {
      '01': 'Full-time',
      '02': 'Part-time',
      '03': 'Self-employed',
      '04': 'Unemployed, seeking full-time',
      '05': 'Unemployed, seeking part-time',
      '06': 'Not employed, not seeking',
    };
    return map[status] || status;
  };

  const getDisabilityLabel = (code: string) => {
    return DISABILITY_TYPES.find((t) => t.code === code)?.label || code;
  };

  const getPriorEducationLabel = (code: string) => {
    return PRIOR_EDUCATION_TYPES.find((t) => t.code === code)?.label || code;
  };

  const getRecognitionTypeLabel = (code: string | null) => {
    if (!code) return '';
    return RECOGNITION_TYPES.find((t) => t.code === code)?.label || code;
  };

  const renderTabContent = () => {
    const currentTabKey = tabs[activeTab]?.key;

    switch (currentTabKey) {
      case 'details':
        return (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-semibold tracking-tight">
                  Name Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  <Card className="px-3 py-2">
                    <div className="space-y-1">
                      <div className="text-muted-foreground text-sm">
                        Salutation
                      </div>
                      <div className="text-base font-medium">
                        {student.salutation || '—'}
                      </div>
                    </div>
                  </Card>
                  <Card className="px-3 py-2">
                    <div className="space-y-1">
                      <div className="text-muted-foreground text-sm">
                        First Name
                      </div>
                      <div className="text-base font-medium">
                        {student.first_name || '—'}
                      </div>
                    </div>
                  </Card>
                  <Card className="px-3 py-2">
                    <div className="space-y-1">
                      <div className="text-muted-foreground text-sm">
                        Middle Name
                      </div>
                      <div className="text-base font-medium">
                        {student.middle_name || '—'}
                      </div>
                    </div>
                  </Card>
                  <Card className="px-3 py-2">
                    <div className="space-y-1">
                      <div className="text-muted-foreground text-sm">
                        Last Name
                      </div>
                      <div className="text-base font-medium">
                        {student.last_name || '—'}
                      </div>
                    </div>
                  </Card>
                  <Card className="px-3 py-2">
                    <div className="space-y-1">
                      <div className="text-muted-foreground text-sm">
                        Preferred Name
                      </div>
                      <div className="text-base font-medium">
                        {student.preferred_name || '—'}
                      </div>
                    </div>
                  </Card>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-semibold tracking-tight">
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  <Card className="px-3 py-2">
                    <div className="space-y-1">
                      <div className="text-muted-foreground text-sm">Email</div>
                      <div className="text-base font-medium">
                        {student.email || '—'}
                      </div>
                    </div>
                  </Card>
                  <Card className="px-3 py-2">
                    <div className="space-y-1">
                      <div className="text-muted-foreground text-sm">
                        Alternative Email
                      </div>
                      <div className="text-base font-medium">
                        {student.alternative_email || '—'}
                      </div>
                    </div>
                  </Card>
                  <Card className="px-3 py-2">
                    <div className="space-y-1">
                      <div className="text-muted-foreground text-sm">
                        Work Phone
                      </div>
                      <div className="text-base font-medium">
                        {student.work_phone || '—'}
                      </div>
                    </div>
                  </Card>
                  <Card className="px-3 py-2">
                    <div className="space-y-1">
                      <div className="text-muted-foreground text-sm">
                        Mobile Phone
                      </div>
                      <div className="text-base font-medium">
                        {student.mobile_phone || '—'}
                      </div>
                    </div>
                  </Card>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-semibold tracking-tight">
                  Identification & Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  <Card className="px-3 py-2">
                    <div className="space-y-1">
                      <div className="text-muted-foreground text-sm">
                        Student ID
                      </div>
                      <div className="text-base font-medium">
                        {student.student_id_display}
                      </div>
                    </div>
                  </Card>
                  <Card className="px-3 py-2">
                    <div className="space-y-1">
                      <div className="text-muted-foreground text-sm">
                        Status
                      </div>
                      <div>
                        <Badge
                          variant={
                            student.status === 'WITHDRAWN'
                              ? 'destructive'
                              : student.status === 'ACTIVE'
                                ? 'default'
                                : 'secondary'
                          }
                        >
                          {student.status}
                        </Badge>
                      </div>
                    </div>
                  </Card>
                  <Card className="px-3 py-2">
                    <div className="space-y-1">
                      <div className="text-muted-foreground text-sm">
                        Date of Birth
                      </div>
                      <div className="text-base font-medium">
                        {student.date_of_birth
                          ? format(
                              new Date(
                                student.date_of_birth as unknown as string
                              ),
                              'dd MMM yyyy'
                            )
                          : '—'}
                      </div>
                    </div>
                  </Card>
                  <Card className="px-3 py-2">
                    <div className="space-y-1">
                      <div className="text-muted-foreground text-sm">
                        Account Created
                      </div>
                      <div className="text-base font-medium">
                        {format(new Date(student.created_at), 'dd MMM yyyy')}
                      </div>
                    </div>
                  </Card>
                  <Card className="px-3 py-2">
                    <div className="space-y-1">
                      <div className="text-muted-foreground text-sm">
                        Application ID
                      </div>
                      <div className="text-base font-medium">
                        {'application_id_display' in student &&
                        student.application_id_display
                          ? student.application_id_display
                          : student.application_id || '—'}
                      </div>
                    </div>
                  </Card>
                  <Card className="px-3 py-2">
                    <div className="space-y-1">
                      <div className="text-muted-foreground text-sm">
                        Xero Contact ID
                      </div>
                      <div className="text-base font-medium">
                        {student.xero_contact_id || '—'}
                      </div>
                    </div>
                  </Card>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-semibold tracking-tight">
                  Address Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  <Card className="px-0 py-0">
                    <CardHeader className="px-3 pt-3 pb-1">
                      <CardTitle className="text-base font-semibold">
                        Street Address
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 pt-0 pb-3">
                      {(() => {
                        const streetAddress = addresses?.find(
                          (a) => a.type === 'street'
                        );
                        if (!streetAddress) return '—';
                        const addressParts = [
                          streetAddress.building_name,
                          streetAddress.unit_details,
                          streetAddress.number_name,
                          streetAddress.po_box,
                          streetAddress.suburb,
                          streetAddress.state,
                          streetAddress.postcode,
                          streetAddress.country,
                        ]
                          .filter(Boolean)
                          .join(', ');
                        return (
                          <div className="text-base font-medium">
                            {addressParts || '—'}
                          </div>
                        );
                      })()}
                    </CardContent>
                  </Card>

                  <Card className="px-0 py-0">
                    <CardHeader className="px-3 pt-3 pb-1">
                      <CardTitle className="text-base font-semibold">
                        Postal Address
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 pt-0 pb-3">
                      {(() => {
                        if (postalSameAsStreet) {
                          const streetAddress = addresses?.find(
                            (a) => a.type === 'street'
                          );
                          if (!streetAddress) return '—';
                          const addressParts = [
                            streetAddress.building_name,
                            streetAddress.unit_details,
                            streetAddress.number_name,
                            streetAddress.po_box,
                            streetAddress.suburb,
                            streetAddress.state,
                            streetAddress.postcode,
                            streetAddress.country,
                          ]
                            .filter(Boolean)
                            .join(', ');
                          return (
                            <div className="text-base font-medium">
                              {addressParts || '—'}
                            </div>
                          );
                        }
                        const postalAddress = addresses?.find(
                          (a) => a.type === 'postal'
                        );
                        if (!postalAddress) return '—';
                        const addressParts = [
                          postalAddress.building_name,
                          postalAddress.unit_details,
                          postalAddress.number_name,
                          postalAddress.po_box,
                          postalAddress.suburb,
                          postalAddress.state,
                          postalAddress.postcode,
                          postalAddress.country,
                        ]
                          .filter(Boolean)
                          .join(', ');
                        return (
                          <div className="text-base font-medium">
                            {addressParts || '—'}
                          </div>
                        );
                      })()}
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-semibold tracking-tight">
                  Emergency Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 md:grid-cols-2">
                  <Card className="px-0 py-0">
                    <CardHeader className="px-3 pt-3 pb-1">
                      <CardTitle className="text-base font-semibold">
                        Emergency Contact
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 pt-0 pb-3">
                      {contacts && contacts.emergency.length > 0 ? (
                        <div className="grid grid-cols-1 gap-2">
                          {contacts.emergency.map((c) => (
                            <div
                              key={`${c.name}-${c.phone_number}`}
                              className="grid grid-cols-1 gap-2"
                            >
                              <Card className="px-3 py-2">
                                <div className="space-y-1">
                                  <div className="text-muted-foreground text-sm">
                                    Name
                                  </div>
                                  <div className="text-base font-medium">
                                    {c.name || '—'}
                                  </div>
                                </div>
                              </Card>
                              <Card className="px-3 py-2">
                                <div className="space-y-1">
                                  <div className="text-muted-foreground text-sm">
                                    Relationship
                                  </div>
                                  <div className="text-base font-medium">
                                    {c.relationship || '—'}
                                  </div>
                                </div>
                              </Card>
                              <Card className="px-3 py-2">
                                <div className="space-y-1">
                                  <div className="text-muted-foreground text-sm">
                                    Phone Number
                                  </div>
                                  <div className="text-base font-medium">
                                    {c.phone_number || '—'}
                                  </div>
                                </div>
                              </Card>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-sm">—</p>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="px-0 py-0">
                    <CardHeader className="px-3 pt-3 pb-1">
                      <CardTitle className="text-base font-semibold">
                        Parent / Guardian
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 pt-0 pb-3">
                      {contacts && contacts.guardians.length > 0 ? (
                        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                          {contacts.guardians.map((g) => (
                            <div
                              key={`${g.name}-${g.email}`}
                              className="grid grid-cols-1 gap-2 md:grid-cols-2"
                            >
                              <Card className="px-3 py-2">
                                <div className="space-y-1">
                                  <div className="text-muted-foreground text-sm">
                                    Name
                                  </div>
                                  <div className="text-base font-medium">
                                    {g.name || '—'}
                                  </div>
                                </div>
                              </Card>
                              <Card className="px-3 py-2">
                                <div className="space-y-1">
                                  <div className="text-muted-foreground text-sm">
                                    Email
                                  </div>
                                  <div className="text-base font-medium">
                                    {g.email || '—'}
                                  </div>
                                </div>
                              </Card>
                              <Card className="px-3 py-2">
                                <div className="space-y-1">
                                  <div className="text-muted-foreground text-sm">
                                    Phone Number
                                  </div>
                                  <div className="text-base font-medium">
                                    {g.phone_number || '—'}
                                  </div>
                                </div>
                              </Card>
                              <Card className="px-3 py-2">
                                <div className="space-y-1">
                                  <div className="text-muted-foreground text-sm">
                                    Relationship
                                  </div>
                                  <div className="text-base font-medium">
                                    {g.relationship || '—'}
                                  </div>
                                </div>
                              </Card>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-sm">—</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-semibold tracking-tight">
                  AVETMISS Compliance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  <Card className="px-0 py-0">
                    <CardHeader className="px-3 pt-3 pb-1">
                      <CardTitle className="text-base font-semibold">
                        Demographics
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 pt-0 pb-3">
                      <div className="grid grid-cols-1 gap-2">
                        <Card className="px-3 py-2">
                          <div className="space-y-1">
                            <div className="text-muted-foreground text-sm">
                              Gender (NAT00080)
                            </div>
                            <div className="text-base font-medium">
                              {avetmiss ? formatGender(avetmiss.gender) : '—'}
                            </div>
                          </div>
                        </Card>
                        <Card className="px-3 py-2">
                          <div className="space-y-1">
                            <div className="text-muted-foreground text-sm">
                              Indigenous Status (NAT00080)
                            </div>
                            <div className="text-base font-medium">
                              {avetmiss
                                ? formatIndigenousStatus(
                                    avetmiss.indigenous_status_id
                                  )
                                : '—'}
                            </div>
                          </div>
                        </Card>
                        <Card className="px-3 py-2">
                          <div className="space-y-1">
                            <div className="text-muted-foreground text-sm">
                              Country of Birth (NAT00080)
                            </div>
                            <div className="text-base font-medium">
                              {avetmiss?.country_of_birth_id || '—'}
                            </div>
                          </div>
                        </Card>
                        <Card className="px-3 py-2">
                          <div className="space-y-1">
                            <div className="text-muted-foreground text-sm">
                              Language Code (NAT00080)
                            </div>
                            <div className="text-base font-medium">
                              {avetmiss?.language_code || '—'}
                            </div>
                          </div>
                        </Card>
                        <Card className="px-3 py-2">
                          <div className="space-y-1">
                            <div className="text-muted-foreground text-sm">
                              Citizenship Status (NAT00080)
                            </div>
                            <div className="text-base font-medium">
                              {avetmiss?.citizenship_status_code || '—'}
                            </div>
                          </div>
                        </Card>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="px-0 py-0">
                    <CardHeader className="px-3 pt-3 pb-1">
                      <CardTitle className="text-base font-semibold">
                        Education
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 pt-0 pb-3">
                      <div className="grid grid-cols-1 gap-2">
                        <Card className="px-3 py-2">
                          <div className="space-y-1">
                            <div className="text-muted-foreground text-sm">
                              Highest School Level Completed (NAT00080)
                            </div>
                            <div className="text-base font-medium">
                              {avetmiss
                                ? formatHighestSchoolLevel(
                                    avetmiss.highest_school_level_id
                                  )
                                : '—'}
                            </div>
                          </div>
                        </Card>
                        <Card className="px-3 py-2">
                          <div className="space-y-1">
                            <div className="text-muted-foreground text-sm">
                              Year Completed (NAT00080)
                            </div>
                            <div className="text-base font-medium">
                              {avetmiss?.year_highest_school_level_completed
                                ? avetmiss.year_highest_school_level_completed ===
                                  '@@'
                                  ? 'Not provided'
                                  : avetmiss.year_highest_school_level_completed
                                : '—'}
                            </div>
                          </div>
                        </Card>
                        <Card className="px-3 py-2">
                          <div className="space-y-1">
                            <div className="text-muted-foreground text-sm">
                              Currently at School (NAT00085)
                            </div>
                            <div className="text-base font-medium">
                              {avetmiss?.at_school_flag === 'Y'
                                ? 'Yes'
                                : avetmiss?.at_school_flag === 'N'
                                  ? 'No'
                                  : '—'}
                            </div>
                          </div>
                        </Card>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="px-0 py-0">
                    <CardHeader className="px-3 pt-3 pb-1">
                      <CardTitle className="text-base font-semibold">
                        Employment
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 pt-0 pb-3">
                      <div className="grid grid-cols-1 gap-2">
                        <Card className="px-3 py-2">
                          <div className="space-y-1">
                            <div className="text-muted-foreground text-sm">
                              Labour Force Status (NAT00080)
                            </div>
                            <div className="text-base font-medium">
                              {avetmiss
                                ? formatLabourForceStatus(
                                    avetmiss.labour_force_status_id
                                  )
                                : '—'}
                            </div>
                          </div>
                        </Card>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="px-0 py-0">
                    <CardHeader className="px-3 pt-3 pb-1">
                      <CardTitle className="text-base font-semibold">
                        Identifiers
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 pt-0 pb-3">
                      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                        <Card className="px-3 py-2">
                          <div className="space-y-1">
                            <div className="text-muted-foreground text-sm">
                              USI (Unique Student Identifier)
                            </div>
                            <div className="text-base font-medium">
                              {avetmiss?.usi || '—'}
                            </div>
                          </div>
                        </Card>
                        <Card className="px-3 py-2">
                          <div className="space-y-1">
                            <div className="text-muted-foreground text-sm">
                              USI Exemption Code
                            </div>
                            <div className="text-base font-medium">
                              {avetmiss?.usi_exemption_code || '—'}
                            </div>
                          </div>
                        </Card>
                        <Card className="px-3 py-2">
                          <div className="space-y-1">
                            <div className="text-muted-foreground text-sm">
                              USI Exemption Flag
                            </div>
                            <div className="text-base font-medium">
                              {avetmiss?.usi_exemption_flag === true
                                ? 'Yes'
                                : avetmiss?.usi_exemption_flag === false
                                  ? 'No'
                                  : '—'}
                            </div>
                          </div>
                        </Card>
                        <Card className="px-3 py-2">
                          <div className="space-y-1">
                            <div className="text-muted-foreground text-sm">
                              USI Exemption Evidence Path
                            </div>
                            <div className="text-base font-medium">
                              {avetmiss?.usi_exemption_evidence_path || '—'}
                            </div>
                          </div>
                        </Card>
                        <Card className="px-3 py-2">
                          <div className="space-y-1">
                            <div className="text-muted-foreground text-sm">
                              USI Status Verified At
                            </div>
                            <div className="text-base font-medium">
                              {avetmiss?.usi_status_verified_at
                                ? format(
                                    new Date(avetmiss.usi_status_verified_at),
                                    'dd MMM yyyy'
                                  )
                                : '—'}
                            </div>
                          </div>
                        </Card>
                        <Card className="px-3 py-2">
                          <div className="space-y-1">
                            <div className="text-muted-foreground text-sm">
                              VSN (Victorian Student Number)
                            </div>
                            <div className="text-base font-medium">
                              {showVSN ? avetmiss?.vsn || '—' : '—'}
                            </div>
                          </div>
                        </Card>
                        <Card className="px-3 py-2">
                          <div className="space-y-1">
                            <div className="text-muted-foreground text-sm">
                              Survey Contact Status (NAT00080)
                            </div>
                            <div className="text-base font-medium">
                              {avetmiss?.survey_contact_status || '—'}
                            </div>
                          </div>
                        </Card>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-semibold tracking-tight">
                  Additional Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  <Card className="px-0 py-0">
                    <CardHeader className="px-3 pt-3 pb-1">
                      <CardTitle className="text-base font-semibold">
                        Disabilities
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 pt-0 pb-3">
                      <div className="grid grid-cols-1 gap-2">
                        <Card className="px-3 py-2">
                          <div className="space-y-1">
                            <div className="text-muted-foreground text-sm">
                              Disability Flag (NAT00080)
                            </div>
                            <div className="text-base font-medium">
                              {avetmiss?.disability_flag === 'Y'
                                ? 'Yes'
                                : avetmiss?.disability_flag === 'N'
                                  ? 'No'
                                  : '—'}
                            </div>
                          </div>
                        </Card>
                        {disabilities.length > 0 ? (
                          <Card className="px-3 py-2">
                            <div className="space-y-1">
                              <div className="text-muted-foreground text-sm">
                                Disability Types (NAT00090)
                              </div>
                              <div className="space-y-2">
                                {disabilities.map((d) => (
                                  <div
                                    key={d.id}
                                    className="text-base font-medium"
                                  >
                                    • {getDisabilityLabel(d.disability_type_id)}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </Card>
                        ) : (
                          <Card className="px-3 py-2">
                            <div className="space-y-1">
                              <div className="text-muted-foreground text-sm">
                                Disability Types (NAT00090)
                              </div>
                              <div className="text-base font-medium">—</div>
                            </div>
                          </Card>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="px-0 py-0">
                    <CardHeader className="px-3 pt-3 pb-1">
                      <CardTitle className="text-base font-semibold">
                        Prior Educational Achievement
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 pt-0 pb-3">
                      <div className="grid grid-cols-1 gap-2">
                        <Card className="px-3 py-2">
                          <div className="space-y-1">
                            <div className="text-muted-foreground text-sm">
                              Prior Education Flag (NAT00085)
                            </div>
                            <div className="text-base font-medium">
                              {avetmiss?.prior_education_flag === 'Y'
                                ? 'Yes'
                                : avetmiss?.prior_education_flag === 'N'
                                  ? 'No'
                                  : '—'}
                            </div>
                          </div>
                        </Card>
                        {priorEducation.length > 0 ? (
                          <Card className="px-3 py-2">
                            <div className="space-y-1">
                              <div className="text-muted-foreground text-sm">
                                Qualifications (NAT00085)
                              </div>
                              <div className="space-y-2">
                                {priorEducation.map((pe) => (
                                  <div
                                    key={pe.id}
                                    className="text-base font-medium"
                                  >
                                    •{' '}
                                    {getPriorEducationLabel(
                                      pe.prior_achievement_id
                                    )}
                                    {pe.recognition_type && (
                                      <span className="text-muted-foreground ml-2 text-sm font-normal">
                                        (
                                        {getRecognitionTypeLabel(
                                          pe.recognition_type
                                        )}
                                        )
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </Card>
                        ) : (
                          <Card className="px-3 py-2">
                            <div className="space-y-1">
                              <div className="text-muted-foreground text-sm">
                                Qualifications (NAT00085)
                              </div>
                              <div className="text-base font-medium">—</div>
                            </div>
                          </Card>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-semibold tracking-tight">
                  CRICOS Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  <Card className="px-0 py-0">
                    <CardHeader className="px-3 pt-3 pb-1">
                      <CardTitle className="text-base font-semibold">
                        Passport & Visa Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 pt-0 pb-3">
                      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                        <Card className="px-3 py-2">
                          <div className="space-y-1">
                            <div className="text-muted-foreground text-sm">
                              Is International
                            </div>
                            <div className="text-base font-medium">
                              {cricos?.is_international === true
                                ? 'Yes'
                                : cricos?.is_international === false
                                  ? 'No'
                                  : '—'}
                            </div>
                          </div>
                        </Card>
                        <Card className="px-3 py-2">
                          <div className="space-y-1">
                            <div className="text-muted-foreground text-sm">
                              CoE Number
                            </div>
                            <div className="text-base font-medium">
                              {cricos?.coe_number || '—'}
                            </div>
                          </div>
                        </Card>
                        <Card className="px-3 py-2">
                          <div className="space-y-1">
                            <div className="text-muted-foreground text-sm">
                              Passport Number
                            </div>
                            <div className="text-base font-medium">
                              {cricos?.passport_number || '—'}
                            </div>
                          </div>
                        </Card>
                        <Card className="px-3 py-2">
                          <div className="space-y-1">
                            <div className="text-muted-foreground text-sm">
                              Passport Issue Date
                            </div>
                            <div className="text-base font-medium">
                              {cricos?.passport_issue_date
                                ? format(
                                    new Date(cricos.passport_issue_date),
                                    'dd MMM yyyy'
                                  )
                                : '—'}
                            </div>
                          </div>
                        </Card>
                        <Card className="px-3 py-2">
                          <div className="space-y-1">
                            <div className="text-muted-foreground text-sm">
                              Passport Expiry Date
                            </div>
                            <div className="text-base font-medium">
                              {cricos?.passport_expiry_date
                                ? format(
                                    new Date(cricos.passport_expiry_date),
                                    'dd MMM yyyy'
                                  )
                                : '—'}
                            </div>
                          </div>
                        </Card>
                        <Card className="px-3 py-2">
                          <div className="space-y-1">
                            <div className="text-muted-foreground text-sm">
                              Place of Birth
                            </div>
                            <div className="text-base font-medium">
                              {cricos?.place_of_birth || '—'}
                            </div>
                          </div>
                        </Card>
                        <Card className="px-3 py-2">
                          <div className="space-y-1">
                            <div className="text-muted-foreground text-sm">
                              Visa Type
                            </div>
                            <div className="text-base font-medium">
                              {cricos?.visa_type || '—'}
                            </div>
                          </div>
                        </Card>
                        <Card className="px-3 py-2">
                          <div className="space-y-1">
                            <div className="text-muted-foreground text-sm">
                              Visa Number
                            </div>
                            <div className="text-base font-medium">
                              {cricos?.visa_number || '—'}
                            </div>
                          </div>
                        </Card>
                        <Card className="px-3 py-2">
                          <div className="space-y-1">
                            <div className="text-muted-foreground text-sm">
                              Visa Expiry Date
                            </div>
                            <div className="text-base font-medium">
                              {cricos?.visa_expiry_date
                                ? format(
                                    new Date(cricos.visa_expiry_date),
                                    'dd MMM yyyy'
                                  )
                                : '—'}
                            </div>
                          </div>
                        </Card>
                        <Card className="px-3 py-2">
                          <div className="space-y-1">
                            <div className="text-muted-foreground text-sm">
                              Visa Grant Date
                            </div>
                            <div className="text-base font-medium">
                              {cricos?.visa_grant_date
                                ? format(
                                    new Date(cricos.visa_grant_date),
                                    'dd MMM yyyy'
                                  )
                                : '—'}
                            </div>
                          </div>
                        </Card>
                        <Card className="px-3 py-2">
                          <div className="space-y-1">
                            <div className="text-muted-foreground text-sm">
                              Holds Visa
                            </div>
                            <div className="text-base font-medium">
                              {cricos?.holds_visa === true
                                ? 'Yes'
                                : cricos?.holds_visa === false
                                  ? 'No'
                                  : '—'}
                            </div>
                          </div>
                        </Card>
                        <Card className="px-3 py-2">
                          <div className="space-y-1">
                            <div className="text-muted-foreground text-sm">
                              Visa Application Office
                            </div>
                            <div className="text-base font-medium">
                              {cricos?.visa_application_office || '—'}
                            </div>
                          </div>
                        </Card>
                        <Card className="px-3 py-2">
                          <div className="space-y-1">
                            <div className="text-muted-foreground text-sm">
                              Country of Citizenship
                            </div>
                            <div className="text-base font-medium">
                              {cricos?.country_of_citizenship || '—'}
                            </div>
                          </div>
                        </Card>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="px-0 py-0">
                    <CardHeader className="px-3 pt-3 pb-1">
                      <CardTitle className="text-base font-semibold">
                        Under 18 Welfare Arrangements
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 pt-0 pb-3">
                      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                        <Card className="px-3 py-2">
                          <div className="space-y-1">
                            <div className="text-muted-foreground text-sm">
                              Is Under 18
                            </div>
                            <div className="text-base font-medium">
                              {cricos?.is_under_18 === true
                                ? 'Yes'
                                : cricos?.is_under_18 === false
                                  ? 'No'
                                  : '—'}
                            </div>
                          </div>
                        </Card>
                        <Card className="px-3 py-2">
                          <div className="space-y-1">
                            <div className="text-muted-foreground text-sm">
                              Provider Accepting Welfare Responsibility
                            </div>
                            <div className="text-base font-medium">
                              {cricos?.provider_accepting_welfare_responsibility ===
                              true
                                ? 'Yes (CAAW)'
                                : cricos?.provider_accepting_welfare_responsibility ===
                                    false
                                  ? 'No'
                                  : '—'}
                            </div>
                          </div>
                        </Card>
                        <Card className="px-3 py-2">
                          <div className="space-y-1">
                            <div className="text-muted-foreground text-sm">
                              Welfare Start Date
                            </div>
                            <div className="text-base font-medium">
                              {cricos?.welfare_start_date
                                ? format(
                                    new Date(cricos.welfare_start_date),
                                    'dd MMM yyyy'
                                  )
                                : '—'}
                            </div>
                          </div>
                        </Card>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="px-0 py-0">
                    <CardHeader className="px-3 pt-3 pb-1">
                      <CardTitle className="text-base font-semibold">
                        Overseas Student Health Cover (OSHC)
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 pt-0 pb-3">
                      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                        <Card className="px-3 py-2">
                          <div className="space-y-1">
                            <div className="text-muted-foreground text-sm">
                              Provider Arranged OSHC
                            </div>
                            <div className="text-base font-medium">
                              {cricos?.provider_arranged_oshc === true
                                ? 'Yes'
                                : cricos?.provider_arranged_oshc === false
                                  ? 'No'
                                  : '—'}
                            </div>
                          </div>
                        </Card>
                        <Card className="px-3 py-2">
                          <div className="space-y-1">
                            <div className="text-muted-foreground text-sm">
                              OSHC Provider Name
                            </div>
                            <div className="text-base font-medium">
                              {cricos?.oshc_provider_name || '—'}
                            </div>
                          </div>
                        </Card>
                        <Card className="px-3 py-2">
                          <div className="space-y-1">
                            <div className="text-muted-foreground text-sm">
                              OSHC Policy Number
                            </div>
                            <div className="text-base font-medium">
                              {cricos?.oshc_policy_number || '—'}
                            </div>
                          </div>
                        </Card>
                        <Card className="px-3 py-2">
                          <div className="space-y-1">
                            <div className="text-muted-foreground text-sm">
                              OSHC Start Date
                            </div>
                            <div className="text-base font-medium">
                              {cricos?.oshc_start_date
                                ? format(
                                    new Date(cricos.oshc_start_date),
                                    'dd MMM yyyy'
                                  )
                                : '—'}
                            </div>
                          </div>
                        </Card>
                        <Card className="px-3 py-2">
                          <div className="space-y-1">
                            <div className="text-muted-foreground text-sm">
                              OSHC End Date
                            </div>
                            <div className="text-base font-medium">
                              {cricos?.oshc_end_date
                                ? format(
                                    new Date(cricos.oshc_end_date),
                                    'dd MMM yyyy'
                                  )
                                : '—'}
                            </div>
                          </div>
                        </Card>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="px-0 py-0">
                    <CardHeader className="px-3 pt-3 pb-1">
                      <CardTitle className="text-base font-semibold">
                        English Language Proficiency
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 pt-0 pb-3">
                      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                        <Card className="px-3 py-2">
                          <div className="space-y-1">
                            <div className="text-muted-foreground text-sm">
                              Has English Test
                            </div>
                            <div className="text-base font-medium">
                              {cricos?.has_english_test === true
                                ? 'Yes'
                                : cricos?.has_english_test === false
                                  ? 'No'
                                  : '—'}
                            </div>
                          </div>
                        </Card>
                        <Card className="px-3 py-2">
                          <div className="space-y-1">
                            <div className="text-muted-foreground text-sm">
                              Test Type
                            </div>
                            <div className="text-base font-medium">
                              {cricos?.english_test_type || '—'}
                            </div>
                          </div>
                        </Card>
                        <Card className="px-3 py-2">
                          <div className="space-y-1">
                            <div className="text-muted-foreground text-sm">
                              Test Score
                            </div>
                            <div className="text-base font-medium">
                              {cricos?.ielts_score || '—'}
                            </div>
                          </div>
                        </Card>
                        <Card className="px-3 py-2">
                          <div className="space-y-1">
                            <div className="text-muted-foreground text-sm">
                              Test Date
                            </div>
                            <div className="text-base font-medium">
                              {cricos?.english_test_date
                                ? format(
                                    new Date(cricos.english_test_date),
                                    'dd MMM yyyy'
                                  )
                                : '—'}
                            </div>
                          </div>
                        </Card>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="px-0 py-0">
                    <CardHeader className="px-3 pt-3 pb-1">
                      <CardTitle className="text-base font-semibold">
                        Previous Study in Australia
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 pt-0 pb-3">
                      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                        <Card className="px-3 py-2">
                          <div className="space-y-1">
                            <div className="text-muted-foreground text-sm">
                              Has Previous Study
                            </div>
                            <div className="text-base font-medium">
                              {cricos?.has_previous_study_australia === true
                                ? 'Yes'
                                : cricos?.has_previous_study_australia === false
                                  ? 'No'
                                  : '—'}
                            </div>
                          </div>
                        </Card>
                        <Card className="px-3 py-2">
                          <div className="space-y-1">
                            <div className="text-muted-foreground text-sm">
                              Previous Provider Name
                            </div>
                            <div className="text-base font-medium">
                              {cricos?.previous_provider_name || '—'}
                            </div>
                          </div>
                        </Card>
                        <Card className="px-3 py-2">
                          <div className="space-y-1">
                            <div className="text-muted-foreground text-sm">
                              Completed Previous Course
                            </div>
                            <div className="text-base font-medium">
                              {cricos?.completed_previous_course === true
                                ? 'Yes'
                                : cricos?.completed_previous_course === false
                                  ? 'No'
                                  : '—'}
                            </div>
                          </div>
                        </Card>
                        <Card className="px-3 py-2">
                          <div className="space-y-1">
                            <div className="text-muted-foreground text-sm">
                              Has Release Letter
                            </div>
                            <div className="text-base font-medium">
                              {cricos?.has_release_letter === true
                                ? 'Yes'
                                : cricos?.has_release_letter === false
                                  ? 'No'
                                  : '—'}
                            </div>
                          </div>
                        </Card>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      case 'course':
        return (
          <CourseProgressionCard studentId={studentUuid ?? ''} mode={mode} />
        );
      case 'documents':
        return <StudentDocumentsPane studentId={studentUuid ?? ''} />;
      case 'assignments':
        return <AssignmentsPane studentId={studentUuid ?? ''} mode={mode} />;
      case 'finance':
        return <FinancePane studentId={studentUuid ?? ''} />;
      case 'attendance':
        return (
          <StudentAttendanceTable studentId={studentUuid ?? ''} mode={mode} />
        );
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-1">
        {mode === 'student' ? (
          <>
            <h1 className="text-2xl font-semibold tracking-tight">
              {`Welcome, ${displayWelcomeName || 'Student'}!`}
            </h1>
            <p className="text-muted-foreground text-sm">
              Here is your current profile, course progression, assignments,
              finance, and attendance.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-semibold tracking-tight">
              {fullName}
            </h1>
            <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
              <CopyToClipboardBadge
                value={student.student_id_display}
                label="Student ID"
                variant="outline"
              />
              <span>•</span>
              <CopyToClipboardBadge
                value={student.email || ''}
                label="Email"
                variant="outline"
              />
              <span>•</span>
              <Badge
                variant={
                  student.status === 'WITHDRAWN'
                    ? 'destructive'
                    : student.status === 'ACTIVE'
                      ? 'default'
                      : 'secondary'
                }
              >
                {student.status}
              </Badge>
            </div>
          </>
        )}
      </div>

      {mode === 'student' && (
        <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Course Progress */}
          <Card>
            <CardHeader className="space-y-1 pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">
                Course Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">
                {metrics.courseProgress.percentage}%
              </div>
              <p className="text-muted-foreground mt-1 text-xs">
                {metrics.courseProgress.completedSubjects} of{' '}
                {metrics.courseProgress.totalSubjects} units past end date
              </p>
            </CardContent>
          </Card>

          {/* Attendance */}
          <Card>
            <CardHeader className="space-y-1 pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">
                Attendance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">
                {metrics.attendance.percentage}%
              </div>
              <p className="text-muted-foreground mt-1 text-xs">
                {metrics.attendance.attendedClasses} of{' '}
                {metrics.attendance.totalPastClasses} past classes attended
              </p>
            </CardContent>
          </Card>

          {/* Competency */}
          <Card>
            <CardHeader className="space-y-1 pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">
                Total Competency
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">
                {metrics.competency.competentUnits}/
                {metrics.competency.totalUnits}
              </div>
              <p className="text-muted-foreground mt-1 text-xs">
                {metrics.competency.percentage}% of units competent
              </p>
            </CardContent>
          </Card>

          {/* Remaining Units */}
          <Card>
            <CardHeader className="space-y-1 pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">
                Remaining Units
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">
                {metrics.competency.remainingUnits}
              </div>
              <p className="text-muted-foreground mt-1 text-xs">
                Units still to achieve competency
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {mode === 'student' && (
        <div className="mb-6 grid gap-4 md:grid-cols-4">
          {/* Pie Chart Card - 1 column */}
          <Card>
            <CardHeader className="items-center pb-0">
              <CardTitle className="text-sm font-medium">
                Unit Evaluation Status
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 pb-0">
              <ChartContainer
                config={evaluationChartConfig}
                className="mx-auto aspect-square max-h-[200px]"
              >
                <PieChart>
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent hideLabel />}
                  />
                  <Pie
                    data={evaluationStatusData}
                    dataKey="count"
                    nameKey="status"
                  />
                </PieChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Announcements Card - 3 columns */}
          <StudentAnnouncementsCard studentId={studentUuid ?? null} />
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold tracking-tight">
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                {tabs.map((tab, i) => (
                  <Button
                    key={tab.key}
                    size="sm"
                    variant={i === activeTab ? 'default' : 'outline'}
                    onClick={() => setActiveTab(i)}
                    aria-label={`Go to ${tab.label}`}
                  >
                    {tab.label}
                  </Button>
                ))}
              </div>
              {mode === 'staff' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (student.email) {
                      openWithRecipients([student.email]);
                    }
                  }}
                  aria-label="Email student"
                  disabled={!student.email}
                >
                  <Mail className="mr-2 h-4 w-4" /> Mail
                </Button>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>{renderTabContent()}</CardContent>
      </Card>
    </div>
  );
}
