'use client';

import { use, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useGetStudentById } from '@/src/hooks/useGetStudentById';
import { useGetStudentAddresses } from '@/src/hooks/useGetStudentAddresses';
import { useGetStudentAvetmiss } from '@/src/hooks/useGetStudentAvetmiss';
import { useGetStudentCricos } from '@/src/hooks/useGetStudentCricos';
import { useGetStudentContacts } from '@/src/hooks/useGetStudentContacts';
import { useGetStudentDisabilities } from '@/src/hooks/useGetStudentDisabilities';
import { useGetStudentPriorEducation } from '@/src/hooks/useGetStudentPriorEducation';
import { CourseProgressionCard } from '../_components/CourseProgressionCard';
import { FinancePane } from './_components/FinancePane';
import { StudentDocumentsPane } from '../_components/StudentDocumentsPane';
import { AssignmentsPane } from '../_components/AssignmentsPane';
import { format } from 'date-fns';

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

type PageProps = { params: Promise<{ id: string }> };

export default function StudentPage({ params }: PageProps) {
  const { id } = use(params);
  const [activeTab, setActiveTab] = useState(0);

  const { data: student, isLoading, isError } = useGetStudentById(id);
  const { data: addresses } = useGetStudentAddresses(id);
  const { data: avetmiss } = useGetStudentAvetmiss(id);
  const { data: cricos } = useGetStudentCricos(id);
  const { data: contacts } = useGetStudentContacts(id);
  const { data: disabilities = [] } = useGetStudentDisabilities(id);
  const { data: priorEducation = [] } = useGetStudentPriorEducation(id);

  // Check if postal address is same as street
  const postalSameAsStreet = useMemo(() => {
    if (!addresses || addresses.length < 2) return false;
    const street = addresses.find((a) => a.type === 'street');
    const postal = addresses.find((a) => a.type === 'postal');
    return !postal && street !== undefined;
  }, [addresses]);

  // Calculate age for VSN display
  const age = useMemo(() => {
    if (!student?.date_of_birth) return null;
    const dob = new Date(student.date_of_birth);
    if (isNaN(dob.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  }, [student?.date_of_birth]);

  // Check if VSN should be shown
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

  const tabs = [
    'Details',
    'Course Progression',
    'Documents',
    'Assignments',
    'Finance',
  ];

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

  // Helper function to format gender
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

  // Helper function to format indigenous status
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

  // Helper function to format highest school level
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

  // Helper function to format labour force status
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

  // Helper function to get disability label
  const getDisabilityLabel = (code: string) => {
    return DISABILITY_TYPES.find((t) => t.code === code)?.label || code;
  };

  // Helper function to get prior education label
  const getPriorEducationLabel = (code: string) => {
    return PRIOR_EDUCATION_TYPES.find((t) => t.code === code)?.label || code;
  };

  // Helper function to get recognition type label
  const getRecognitionTypeLabel = (code: string | null) => {
    if (!code) return '';
    return RECOGNITION_TYPES.find((t) => t.code === code)?.label || code;
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 0: // Details
        return (
          <div className="space-y-4">
            {/* Name Information Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-semibold tracking-tight">
                  Name Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="space-y-1">
                    <div className="text-muted-foreground text-sm">
                      Salutation
                    </div>
                    <div className="text-base font-medium">
                      {student.salutation || '—'}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-muted-foreground text-sm">
                      First Name
                    </div>
                    <div className="text-base font-medium">
                      {student.first_name || '—'}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-muted-foreground text-sm">
                      Middle Name
                    </div>
                    <div className="text-base font-medium">
                      {student.middle_name || '—'}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-muted-foreground text-sm">
                      Last Name
                    </div>
                    <div className="text-base font-medium">
                      {student.last_name || '—'}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-muted-foreground text-sm">
                      Preferred Name
                    </div>
                    <div className="text-base font-medium">
                      {student.preferred_name || '—'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact Information Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-semibold tracking-tight">
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="space-y-1">
                    <div className="text-muted-foreground text-sm">Email</div>
                    <div className="text-base font-medium">
                      {student.email || '—'}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-muted-foreground text-sm">
                      Alternative Email
                    </div>
                    <div className="text-base font-medium">
                      {student.alternative_email || '—'}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-muted-foreground text-sm">
                      Work Phone
                    </div>
                    <div className="text-base font-medium">
                      {student.work_phone || '—'}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-muted-foreground text-sm">
                      Mobile Phone
                    </div>
                    <div className="text-base font-medium">
                      {student.mobile_phone || '—'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Identification & Status Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-semibold tracking-tight">
                  Identification & Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="space-y-1">
                    <div className="text-muted-foreground text-sm">
                      Student ID
                    </div>
                    <div className="text-base font-medium">
                      {student.student_id_display}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-muted-foreground text-sm">Status</div>
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
                  <div className="space-y-1">
                    <div className="text-muted-foreground text-sm">
                      Account Created
                    </div>
                    <div className="text-base font-medium">
                      {format(new Date(student.created_at), 'dd MMM yyyy')}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Address Information Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-semibold tracking-tight">
                  Address Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                {addresses && addresses.length > 0 ? (
                  <div className="grid gap-6">
                    {addresses.map((a) => (
                      <div
                        key={`${a.type}-${a.postcode}-${a.suburb}`}
                        className="space-y-2"
                      >
                        <div className="text-base font-medium capitalize">
                          {a.type === 'street'
                            ? 'Street Address'
                            : 'Postal Address'}
                        </div>
                        {postalSameAsStreet && a.type === 'street' && (
                          <div className="text-muted-foreground text-sm italic">
                            (Postal address same as street address)
                          </div>
                        )}
                        <div className="text-base font-medium">
                          {[
                            a.building_name,
                            a.unit_details,
                            a.number_name,
                            a.po_box,
                          ]
                            .filter(Boolean)
                            .join(', ')}
                        </div>
                        <div className="text-base font-medium">
                          {[a.suburb, a.state, a.postcode]
                            .filter(Boolean)
                            .join(' ')}
                        </div>
                        <div className="text-muted-foreground text-sm">
                          {a.country}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No addresses.</p>
                )}
              </CardContent>
            </Card>

            {/* Contact Information Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-semibold tracking-tight">
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                {contacts &&
                (contacts.emergency.length > 0 ||
                  contacts.guardians.length > 0) ? (
                  <div className="grid gap-6">
                    {contacts.emergency.length > 0 && (
                      <div>
                        <h3 className="mb-4 text-lg font-medium">
                          Emergency Contacts
                        </h3>
                        <div className="grid gap-6">
                          {contacts.emergency.map((c) => (
                            <div
                              key={`${c.name}-${c.phone_number}`}
                              className="grid grid-cols-1 gap-6 md:grid-cols-2"
                            >
                              <div className="space-y-1">
                                <div className="text-muted-foreground text-sm">
                                  Name
                                </div>
                                <div className="text-base font-medium">
                                  {c.name || '—'}
                                </div>
                              </div>
                              <div className="space-y-1">
                                <div className="text-muted-foreground text-sm">
                                  Relationship
                                </div>
                                <div className="text-base font-medium">
                                  {c.relationship || '—'}
                                </div>
                              </div>
                              <div className="space-y-1">
                                <div className="text-muted-foreground text-sm">
                                  Phone Number
                                </div>
                                <div className="text-base font-medium">
                                  {c.phone_number || '—'}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {contacts.guardians.length > 0 && (
                      <div>
                        <h3 className="mb-4 text-lg font-medium">
                          Parent / Guardian
                        </h3>
                        <div className="grid gap-6">
                          {contacts.guardians.map((g) => (
                            <div
                              key={`${g.name}-${g.email}`}
                              className="grid grid-cols-1 gap-6 md:grid-cols-2"
                            >
                              <div className="space-y-1">
                                <div className="text-muted-foreground text-sm">
                                  Name
                                </div>
                                <div className="text-base font-medium">
                                  {g.name || '—'}
                                </div>
                              </div>
                              <div className="space-y-1">
                                <div className="text-muted-foreground text-sm">
                                  Email
                                </div>
                                <div className="text-base font-medium">
                                  {g.email || '—'}
                                </div>
                              </div>
                              <div className="space-y-1">
                                <div className="text-muted-foreground text-sm">
                                  Phone Number
                                </div>
                                <div className="text-base font-medium">
                                  {g.phone_number || '—'}
                                </div>
                              </div>
                              {g.relationship && (
                                <div className="space-y-1">
                                  <div className="text-muted-foreground text-sm">
                                    Relationship
                                  </div>
                                  <div className="text-base font-medium">
                                    {g.relationship}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No contacts.</p>
                )}
              </CardContent>
            </Card>

            {/* AVETMISS Compliance Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-semibold tracking-tight">
                  AVETMISS Compliance
                </CardTitle>
              </CardHeader>
              <CardContent>
                {avetmiss ? (
                  <div className="space-y-6">
                    {/* Demographics Section */}
                    <div>
                      <h3 className="mb-4 text-lg font-medium">Demographics</h3>
                      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <div className="space-y-1">
                          <div className="text-muted-foreground text-sm">
                            Gender (NAT00080)
                          </div>
                          <div className="text-base font-medium">
                            {formatGender(avetmiss.gender)}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-muted-foreground text-sm">
                            Indigenous Status (NAT00080)
                          </div>
                          <div className="text-base font-medium">
                            {formatIndigenousStatus(
                              avetmiss.indigenous_status_id
                            )}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-muted-foreground text-sm">
                            Country of Birth (NAT00080)
                          </div>
                          <div className="text-base font-medium">
                            {avetmiss.country_of_birth_id || '—'}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-muted-foreground text-sm">
                            Language Code (NAT00080)
                          </div>
                          <div className="text-base font-medium">
                            {avetmiss.language_code || '—'}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-muted-foreground text-sm">
                            Citizenship Status (NAT00080)
                          </div>
                          <div className="text-base font-medium">
                            {avetmiss.citizenship_status_code || '—'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Education Section */}
                    <div>
                      <h3 className="mb-4 text-lg font-medium">Education</h3>
                      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <div className="space-y-1">
                          <div className="text-muted-foreground text-sm">
                            Highest School Level Completed (NAT00080)
                          </div>
                          <div className="text-base font-medium">
                            {formatHighestSchoolLevel(
                              avetmiss.highest_school_level_id
                            )}
                          </div>
                        </div>
                        {avetmiss.year_highest_school_level_completed && (
                          <div className="space-y-1">
                            <div className="text-muted-foreground text-sm">
                              Year Completed (NAT00080)
                            </div>
                            <div className="text-base font-medium">
                              {avetmiss.year_highest_school_level_completed ===
                              '@@'
                                ? 'Not provided'
                                : avetmiss.year_highest_school_level_completed}
                            </div>
                          </div>
                        )}
                        <div className="space-y-1">
                          <div className="text-muted-foreground text-sm">
                            Currently at School (NAT00085)
                          </div>
                          <div className="text-base font-medium">
                            {avetmiss.at_school_flag === 'Y'
                              ? 'Yes'
                              : avetmiss.at_school_flag === 'N'
                                ? 'No'
                                : '—'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Employment Section */}
                    <div>
                      <h3 className="mb-4 text-lg font-medium">Employment</h3>
                      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <div className="space-y-1">
                          <div className="text-muted-foreground text-sm">
                            Labour Force Status (NAT00080)
                          </div>
                          <div className="text-base font-medium">
                            {formatLabourForceStatus(
                              avetmiss.labour_force_status_id
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Identifiers Section */}
                    <div>
                      <h3 className="mb-4 text-lg font-medium">Identifiers</h3>
                      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <div className="space-y-1">
                          <div className="text-muted-foreground text-sm">
                            USI (Unique Student Identifier)
                          </div>
                          <div className="text-base font-medium">
                            {avetmiss.usi || '—'}
                          </div>
                        </div>
                        {showVSN && (
                          <div className="space-y-1">
                            <div className="text-muted-foreground text-sm">
                              VSN (Victorian Student Number)
                            </div>
                            <div className="text-base font-medium">
                              {avetmiss.vsn || '—'}
                            </div>
                          </div>
                        )}
                        <div className="space-y-1">
                          <div className="text-muted-foreground text-sm">
                            Survey Contact Status (NAT00080)
                          </div>
                          <div className="text-base font-medium">
                            {avetmiss.survey_contact_status || '—'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    No AVETMISS data.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Additional Information Card */}
            {(avetmiss?.disability_flag ||
              disabilities.length > 0 ||
              avetmiss?.prior_education_flag ||
              priorEducation.length > 0) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl font-semibold tracking-tight">
                    Additional Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Disabilities Section */}
                    <div>
                      <h3 className="mb-4 text-lg font-medium">Disabilities</h3>
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <div className="text-muted-foreground text-sm">
                            Disability Flag (NAT00080)
                          </div>
                          <div className="text-base font-medium">
                            {avetmiss?.disability_flag === 'Y'
                              ? 'Yes'
                              : avetmiss?.disability_flag === 'N'
                                ? 'No'
                                : 'Not stated'}
                          </div>
                        </div>
                        {avetmiss?.disability_flag === 'Y' &&
                          disabilities.length > 0 && (
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
                          )}
                      </div>
                    </div>

                    {/* Prior Education Section */}
                    <div>
                      <h3 className="mb-4 text-lg font-medium">
                        Prior Educational Achievement
                      </h3>
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <div className="text-muted-foreground text-sm">
                            Prior Education Flag (NAT00085)
                          </div>
                          <div className="text-base font-medium">
                            {avetmiss?.prior_education_flag === 'Y'
                              ? 'Yes'
                              : avetmiss?.prior_education_flag === 'N'
                                ? 'No'
                                : 'Not stated'}
                          </div>
                        </div>
                        {avetmiss?.prior_education_flag === 'Y' &&
                          priorEducation.length > 0 && (
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
                          )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* CRICOS Information Card */}
            {cricos && cricos.is_international && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl font-semibold tracking-tight">
                    CRICOS Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Passport & Visa Section */}
                    <div>
                      <h3 className="mb-4 text-lg font-medium">
                        Passport & Visa Information
                      </h3>
                      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <div className="space-y-1">
                          <div className="text-muted-foreground text-sm">
                            Passport Number
                          </div>
                          <div className="text-base font-medium">
                            {cricos.passport_number || '—'}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-muted-foreground text-sm">
                            Passport Issue Date
                          </div>
                          <div className="text-base font-medium">
                            {cricos.passport_issue_date
                              ? format(
                                  new Date(cricos.passport_issue_date),
                                  'dd MMM yyyy'
                                )
                              : '—'}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-muted-foreground text-sm">
                            Passport Expiry Date
                          </div>
                          <div className="text-base font-medium">
                            {cricos.passport_expiry_date
                              ? format(
                                  new Date(cricos.passport_expiry_date),
                                  'dd MMM yyyy'
                                )
                              : '—'}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-muted-foreground text-sm">
                            Place of Birth
                          </div>
                          <div className="text-base font-medium">
                            {cricos.place_of_birth || '—'}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-muted-foreground text-sm">
                            Visa Type
                          </div>
                          <div className="text-base font-medium">
                            {cricos.visa_type || '—'}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-muted-foreground text-sm">
                            Visa Number
                          </div>
                          <div className="text-base font-medium">
                            {cricos.visa_number || '—'}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-muted-foreground text-sm">
                            Visa Application Office
                          </div>
                          <div className="text-base font-medium">
                            {cricos.visa_application_office || '—'}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-muted-foreground text-sm">
                            Country of Citizenship
                          </div>
                          <div className="text-base font-medium">
                            {cricos.country_of_citizenship || '—'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Under 18 Welfare Section */}
                    {cricos.is_under_18 !== null && (
                      <div>
                        <h3 className="mb-4 text-lg font-medium">
                          Under 18 Welfare Arrangements
                        </h3>
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                          <div className="space-y-1">
                            <div className="text-muted-foreground text-sm">
                              Is Under 18
                            </div>
                            <div className="text-base font-medium">
                              {cricos.is_under_18 ? 'Yes' : 'No'}
                            </div>
                          </div>
                          {cricos.is_under_18 && (
                            <>
                              <div className="space-y-1">
                                <div className="text-muted-foreground text-sm">
                                  Provider Accepting Welfare Responsibility
                                </div>
                                <div className="text-base font-medium">
                                  {cricos.provider_accepting_welfare_responsibility ===
                                  true
                                    ? 'Yes (CAAW)'
                                    : cricos.provider_accepting_welfare_responsibility ===
                                        false
                                      ? 'No'
                                      : '—'}
                                </div>
                              </div>
                              {cricos.provider_accepting_welfare_responsibility ===
                                true && (
                                <div className="space-y-1">
                                  <div className="text-muted-foreground text-sm">
                                    Welfare Start Date
                                  </div>
                                  <div className="text-base font-medium">
                                    {cricos.welfare_start_date
                                      ? format(
                                          new Date(cricos.welfare_start_date),
                                          'dd MMM yyyy'
                                        )
                                      : '—'}
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {/* OSHC Section */}
                    {cricos.provider_arranged_oshc !== null && (
                      <div>
                        <h3 className="mb-4 text-lg font-medium">
                          Overseas Student Health Cover (OSHC)
                        </h3>
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                          <div className="space-y-1">
                            <div className="text-muted-foreground text-sm">
                              Provider Arranged OSHC
                            </div>
                            <div className="text-base font-medium">
                              {cricos.provider_arranged_oshc ? 'Yes' : 'No'}
                            </div>
                          </div>
                          {cricos.provider_arranged_oshc && (
                            <>
                              <div className="space-y-1">
                                <div className="text-muted-foreground text-sm">
                                  OSHC Provider Name
                                </div>
                                <div className="text-base font-medium">
                                  {cricos.oshc_provider_name || '—'}
                                </div>
                              </div>
                              <div className="space-y-1">
                                <div className="text-muted-foreground text-sm">
                                  OSHC Start Date
                                </div>
                                <div className="text-base font-medium">
                                  {cricos.oshc_start_date
                                    ? format(
                                        new Date(cricos.oshc_start_date),
                                        'dd MMM yyyy'
                                      )
                                    : '—'}
                                </div>
                              </div>
                              <div className="space-y-1">
                                <div className="text-muted-foreground text-sm">
                                  OSHC End Date
                                </div>
                                <div className="text-base font-medium">
                                  {cricos.oshc_end_date
                                    ? format(
                                        new Date(cricos.oshc_end_date),
                                        'dd MMM yyyy'
                                      )
                                    : '—'}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {/* English Proficiency Section */}
                    {cricos.has_english_test !== null && (
                      <div>
                        <h3 className="mb-4 text-lg font-medium">
                          English Language Proficiency
                        </h3>
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                          <div className="space-y-1">
                            <div className="text-muted-foreground text-sm">
                              Has English Test
                            </div>
                            <div className="text-base font-medium">
                              {cricos.has_english_test ? 'Yes' : 'No'}
                            </div>
                          </div>
                          {cricos.has_english_test && (
                            <>
                              <div className="space-y-1">
                                <div className="text-muted-foreground text-sm">
                                  Test Type
                                </div>
                                <div className="text-base font-medium">
                                  {cricos.english_test_type || '—'}
                                </div>
                              </div>
                              <div className="space-y-1">
                                <div className="text-muted-foreground text-sm">
                                  Test Score
                                </div>
                                <div className="text-base font-medium">
                                  {cricos.ielts_score || '—'}
                                </div>
                              </div>
                              <div className="space-y-1">
                                <div className="text-muted-foreground text-sm">
                                  Test Date
                                </div>
                                <div className="text-base font-medium">
                                  {cricos.english_test_date
                                    ? format(
                                        new Date(cricos.english_test_date),
                                        'dd MMM yyyy'
                                      )
                                    : '—'}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Previous Study Section */}
                    {cricos.has_previous_study_australia !== null && (
                      <div>
                        <h3 className="mb-4 text-lg font-medium">
                          Previous Study in Australia
                        </h3>
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                          <div className="space-y-1">
                            <div className="text-muted-foreground text-sm">
                              Has Previous Study
                            </div>
                            <div className="text-base font-medium">
                              {cricos.has_previous_study_australia
                                ? 'Yes'
                                : 'No'}
                            </div>
                          </div>
                          {cricos.has_previous_study_australia && (
                            <>
                              <div className="space-y-1">
                                <div className="text-muted-foreground text-sm">
                                  Previous Provider Name
                                </div>
                                <div className="text-base font-medium">
                                  {cricos.previous_provider_name || '—'}
                                </div>
                              </div>
                              <div className="space-y-1">
                                <div className="text-muted-foreground text-sm">
                                  Completed Previous Course
                                </div>
                                <div className="text-base font-medium">
                                  {cricos.completed_previous_course === true
                                    ? 'Yes'
                                    : cricos.completed_previous_course === false
                                      ? 'No'
                                      : '—'}
                                </div>
                              </div>
                              <div className="space-y-1">
                                <div className="text-muted-foreground text-sm">
                                  Has Release Letter
                                </div>
                                <div className="text-base font-medium">
                                  {cricos.has_release_letter === true
                                    ? 'Yes'
                                    : cricos.has_release_letter === false
                                      ? 'No'
                                      : '—'}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case 1: // Course Progression
        return <CourseProgressionCard studentId={id} />;

      case 2: // Documents
        return <StudentDocumentsPane studentId={id} />;

      case 3: // Assignments
        return <AssignmentsPane studentId={id} />;
      case 4: // Finance
        return <FinancePane studentId={id} />;

      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">{fullName}</h1>
        <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
          <span>ID: {student.student_id_display}</span>
          <span>•</span>
          <span>{student.email}</span>
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
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold tracking-tight">
            <div className="flex items-center gap-2">
              {tabs.map((tab, i) => (
                <Button
                  key={tab}
                  size="sm"
                  variant={i === activeTab ? 'default' : 'outline'}
                  onClick={() => setActiveTab(i)}
                  aria-label={`Go to ${tab}`}
                >
                  {tab}
                </Button>
              ))}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>{renderTabContent()}</CardContent>
      </Card>
    </div>
  );
}
