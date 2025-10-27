'use client';

import { use, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useGetStudentById } from '@/src/hooks/useGetStudentById';
import { useGetStudentAddresses } from '@/src/hooks/useGetStudentAddresses';
import { useGetStudentAvetmiss } from '@/src/hooks/useGetStudentAvetmiss';
import { useGetStudentCricos } from '@/src/hooks/useGetStudentCricos';
import { useGetStudentContacts } from '@/src/hooks/useGetStudentContacts';
import { CourseProgressionCard } from '../_components/CourseProgressionCard';
import { FinancePane } from './_components/FinancePane';
import { StudentDocumentsPane } from '../_components/StudentDocumentsPane';
import { AssignmentsPane } from '../_components/AssignmentsPane';
import { format } from 'date-fns';

type PageProps = { params: Promise<{ id: string }> };

export default function StudentPage({ params }: PageProps) {
  const { id } = use(params);
  const [activeTab, setActiveTab] = useState(0);

  const { data: student, isLoading, isError } = useGetStudentById(id);
  const { data: addresses } = useGetStudentAddresses(id);
  const { data: avetmiss } = useGetStudentAvetmiss(id);
  const { data: cricos } = useGetStudentCricos(id);
  const { data: contacts } = useGetStudentContacts(id);

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

  const fullName = [student.first_name, student.last_name]
    .filter(Boolean)
    .join(' ');

  const renderTabContent = () => {
    switch (activeTab) {
      case 0: // Details
        return (
          <div className="space-y-4">
            {/* Personal Information Card */}
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
                  <div>
                    <div className="text-muted-foreground">Full Name</div>
                    <div>{fullName}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Student ID</div>
                    <div>{student.student_id_display}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Status</div>
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
                  <div>
                    <div className="text-muted-foreground">Email</div>
                    <div>{student.email || '—'}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Date of Birth</div>
                    <div>
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
                  <div>
                    <div className="text-muted-foreground">Account Created</div>
                    <div>
                      {format(new Date(student.created_at), 'dd MMM yyyy')}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Address Information Card */}
            <Card>
              <CardHeader>
                <CardTitle>Address Information</CardTitle>
              </CardHeader>
              <CardContent>
                {addresses && addresses.length > 0 ? (
                  <div className="grid gap-3">
                    {addresses.map((a) => (
                      <div
                        key={`${a.type}-${a.postcode}-${a.suburb}`}
                        className="text-sm"
                      >
                        <div className="font-medium capitalize">{a.type}</div>
                        <div className="text-muted-foreground">
                          {[a.building_name, a.unit_details, a.number_name]
                            .filter(Boolean)
                            .join(' ')}
                        </div>
                        <div>
                          {[a.suburb, a.state, a.postcode]
                            .filter(Boolean)
                            .join(' ')}
                        </div>
                        <div className="text-muted-foreground">{a.country}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No addresses.</p>
                )}
              </CardContent>
            </Card>

            {/* AVETMISS Compliance Card */}
            <Card>
              <CardHeader>
                <CardTitle>AVETMISS Compliance</CardTitle>
              </CardHeader>
              <CardContent>
                {avetmiss ? (
                  <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
                    <div>
                      <div className="text-muted-foreground">
                        Gender (NAT00080)
                      </div>
                      <div>{avetmiss.gender ?? '—'}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">
                        Highest School Level (NAT00080)
                      </div>
                      <div>{avetmiss.highest_school_level_id ?? '—'}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">
                        Indigenous Status (NAT00080)
                      </div>
                      <div>{avetmiss.indigenous_status_id ?? '—'}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">
                        Labour Force Status (NAT00080)
                      </div>
                      <div>{avetmiss.labour_force_status_id ?? '—'}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">
                        Country of Birth (NAT00080)
                      </div>
                      <div>{avetmiss.country_of_birth_id ?? '—'}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">
                        Language Code (NAT00080)
                      </div>
                      <div>{avetmiss.language_code ?? '—'}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">
                        Citizenship Status (NAT00080)
                      </div>
                      <div>{avetmiss.citizenship_status_code ?? '—'}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">
                        At School Flag (NAT00080)
                      </div>
                      <div>{avetmiss.at_school_flag ? 'Yes' : 'No'}</div>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    No AVETMISS data.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* CRICOS Data Card */}
            {cricos && cricos.is_international && (
              <Card>
                <CardHeader>
                  <CardTitle>CRICOS Data</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
                    <div>
                      <div className="text-muted-foreground">
                        Passport Number
                      </div>
                      <div>{cricos.passport_number ?? '—'}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Visa Type</div>
                      <div>{cricos.visa_type ?? '—'}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Visa Number</div>
                      <div>{cricos.visa_number ?? '—'}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">
                        Country of Citizenship
                      </div>
                      <div>{cricos.country_of_citizenship ?? '—'}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">IELTS Score</div>
                      <div>{cricos.ielts_score ?? '—'}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Contacts Card */}
            <Card>
              <CardHeader>
                <CardTitle>Contacts</CardTitle>
              </CardHeader>
              <CardContent>
                {contacts &&
                (contacts.emergency.length > 0 ||
                  contacts.guardians.length > 0) ? (
                  <div className="grid gap-4 text-sm">
                    {contacts.emergency.length > 0 && (
                      <div>
                        <div className="mb-1 font-medium">Emergency</div>
                        <div className="grid gap-2">
                          {contacts.emergency.map((c) => (
                            <div
                              key={`${c.name}-${c.phone_number}`}
                              className="text-sm"
                            >
                              <div className="text-muted-foreground">
                                {c.relationship}
                              </div>
                              <div>{c.name}</div>
                              <div className="text-muted-foreground">
                                {c.phone_number}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {contacts.guardians.length > 0 && (
                      <div>
                        <div className="mb-1 font-medium">Guardians</div>
                        <div className="grid gap-2">
                          {contacts.guardians.map((g) => (
                            <div
                              key={`${g.name}-${g.email}`}
                              className="text-sm"
                            >
                              <div>{g.name}</div>
                              <div className="text-muted-foreground">
                                {g.email}
                              </div>
                              <div className="text-muted-foreground">
                                {g.phone_number}
                              </div>
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
