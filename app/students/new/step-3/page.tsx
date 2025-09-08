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
import { Badge } from '@/components/ui/badge';
import { WizardProgress } from '../components/wizard-progress';
import { useApplicationWizard } from '@/stores/application-wizard';
import { useAutosave } from '@/hooks/use-autosave';
import type { Step3ProgramSelection } from '@/lib/schemas/application-schemas';
import { Step3ProgramSelectionSchema } from '@/lib/schemas/application-schemas';
import { 
  usePrograms, 
  useCourseOfferings, 
  useProgramSubjects,
  transformProgramsForSelect,
  transformCourseOfferingsForSelect,
  transformSubjectsForSelection
} from '@/hooks/use-programs';
import { useFundingSources, useStudyReasons, transformReferenceData } from '@/hooks/use-reference-data';
import { useLocations, transformLocationsForSelect } from '@/hooks/use-locations';

// =============================================================================
// STEP 3: PROGRAM SELECTION
// Matches backend EnrolmentDetails schema exactly
// =============================================================================

export default function Step3ProgramSelection() {
  const router = useRouter();
  const { updateStep3Data, nextStep, previousStep, draftId } = useApplicationWizard();
  
  // Form state
  const [selectedProgramId, setSelectedProgramId] = useState<string>('');
  const [selectedCourseOfferingId, setSelectedCourseOfferingId] = useState<string>('');
  const [selectedCoreSubjects, setSelectedCoreSubjects] = useState<string[]>([]);
  const [selectedElectiveSubjects, setSelectedElectiveSubjects] = useState<string[]>([]);
  
  // Reference data queries
  const { data: programsData, isLoading: programsLoading } = usePrograms();
  const { data: courseOfferingsData, isLoading: courseOfferingsLoading } = useCourseOfferings(selectedProgramId);
  const { data: subjectsData, isLoading: subjectsLoading } = useProgramSubjects(selectedProgramId);
  const { data: fundingSourcesData, isLoading: fundingSourcesLoading } = useFundingSources();
  const { data: studyReasonsData, isLoading: studyReasonsLoading } = useStudyReasons();
  const { data: locationsData, isLoading: locationsLoading } = useLocations();
  
  // Transform data for select components
  const programs = transformProgramsForSelect(programsData);
  const courseOfferings = transformCourseOfferingsForSelect(courseOfferingsData);
  const { core: coreSubjects, electives: electiveSubjects } = transformSubjectsForSelection(subjectsData);
  const fundingSources = transformReferenceData(fundingSourcesData);
  const studyReasons = transformReferenceData(studyReasonsData);
  const locations = transformLocationsForSelect(locationsData);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<Step3ProgramSelection>({
    defaultValues: {
      enrolmentDetails: {
        programId: '',
        courseOfferingId: '',
        subjectStructure: {
          coreSubjectIds: [],
          electiveSubjectIds: [],
        },
        startDate: '',
        expectedCompletionDate: '',
        deliveryLocationId: '',
        deliveryModeId: '',
        fundingSourceId: '',
        studyReasonId: '',
        isVetInSchools: false,
      },
    },
  });
  
  const watchedValues = watch();

  // Autosave draft (backend-first) for Step 3
  const { schedule, saveNow } = useAutosave({
    applicationId: draftId || '',
    enabled: Boolean(draftId),
    debounceMs: 1500,
    getPayload: () => ({
      enrolmentDetails: {
        programId: watchedValues.enrolmentDetails?.programId,
        courseOfferingId: watchedValues.enrolmentDetails?.courseOfferingId,
        subjectStructure: watchedValues.enrolmentDetails?.subjectStructure,
        startDate: watchedValues.enrolmentDetails?.startDate,
        expectedCompletionDate: watchedValues.enrolmentDetails?.expectedCompletionDate,
        deliveryLocationId: watchedValues.enrolmentDetails?.deliveryLocationId,
        deliveryModeId: watchedValues.enrolmentDetails?.deliveryModeId,
        fundingSourceId: watchedValues.enrolmentDetails?.fundingSourceId,
        studyReasonId: watchedValues.enrolmentDetails?.studyReasonId,
        isVetInSchools: Boolean(watchedValues.enrolmentDetails?.isVetInSchools),
      },
    }),
  });

  useEffect(() => {
    schedule();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    watchedValues.enrolmentDetails?.programId,
    watchedValues.enrolmentDetails?.courseOfferingId,
    JSON.stringify(watchedValues.enrolmentDetails?.subjectStructure),
    watchedValues.enrolmentDetails?.startDate,
    watchedValues.enrolmentDetails?.expectedCompletionDate,
    watchedValues.enrolmentDetails?.deliveryLocationId,
    watchedValues.enrolmentDetails?.deliveryModeId,
    watchedValues.enrolmentDetails?.fundingSourceId,
    watchedValues.enrolmentDetails?.studyReasonId,
    watchedValues.enrolmentDetails?.isVetInSchools,
  ]);
  
  // Reset course offering when program changes
  useEffect(() => {
    if (selectedProgramId) {
      setSelectedCourseOfferingId('');
      setSelectedCoreSubjects([]);
      setSelectedElectiveSubjects([]);
      setValue('enrolmentDetails.courseOfferingId', '');
      setValue('enrolmentDetails.subjectStructure.coreSubjectIds', []);
      setValue('enrolmentDetails.subjectStructure.electiveSubjectIds', []);
    }
  }, [selectedProgramId, setValue]);
  
  const onSubmit: SubmitHandler<Step3ProgramSelection> = async (data) => {
    try {
      // Update wizard state
      updateStep3Data(data);
      
      // Move to next step
      nextStep();
      
      // Navigate to step 4
      router.push('/students/new/step-4');
    } catch (error) {
      console.error('Error submitting step 3:', error);
    }
  };
  
  const handleNext = async () => {
    await saveNow();
    handleSubmit(onSubmit)();
  };
  
  const handlePrevious = async () => {
    await saveNow();
    previousStep();
    router.push('/students/new/step-2');
  };
  
  const handleProgramChange = (programId: string) => {
    setSelectedProgramId(programId);
    setValue('enrolmentDetails.programId', programId);
  };
  
  const handleCourseOfferingChange = (offeringId: string) => {
    setSelectedCourseOfferingId(offeringId);
    setValue('enrolmentDetails.courseOfferingId', offeringId);
    
    // Set start and end dates from course offering
    const offering = courseOfferings.find(o => o.value === offeringId);
    if (offering) {
      setValue('enrolmentDetails.startDate', offering.startDate);
      setValue('enrolmentDetails.expectedCompletionDate', offering.endDate);
    }
  };
  
  const handleCoreSubjectChange = (subjectId: string, checked: boolean) => {
    const newSubjects = checked 
      ? [...selectedCoreSubjects, subjectId]
      : selectedCoreSubjects.filter(id => id !== subjectId);
    
    setSelectedCoreSubjects(newSubjects);
    setValue('enrolmentDetails.subjectStructure.coreSubjectIds', newSubjects);
  };
  
  const handleElectiveSubjectChange = (subjectId: string, checked: boolean) => {
    const newSubjects = checked 
      ? [...selectedElectiveSubjects, subjectId]
      : selectedElectiveSubjects.filter(id => id !== subjectId);
    
    setSelectedElectiveSubjects(newSubjects);
    setValue('enrolmentDetails.subjectStructure.electiveSubjectIds', newSubjects);
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
            <h1 className="text-3xl font-bold text-foreground">Program & Intake</h1>
            <p className="mt-2 text-muted-foreground">Staff: record the program, intake, and subjects.</p>
          </div>
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* Program Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Program</CardTitle>
                <CardDescription>Select the program being enrolled.</CardDescription>
              </CardHeader>
              <CardContent>
                <div>
                  <Label htmlFor="program">Program</Label>
                  <Select onValueChange={handleProgramChange}>
                    <SelectTrigger aria-label="Program" role="combobox" className="mt-2" tabIndex={0}>
                      <SelectValue placeholder="Select a program" />
                    </SelectTrigger>
                      <SelectContent>
                        {programsLoading ? (
                          <SelectItem value="loading-programs" disabled>Loading programs...</SelectItem>
                        ) : programs.length === 0 ? (
                          <SelectItem value="no-programs" disabled>No programs available</SelectItem>
                        ) : (
                        programs.map((program) => (
                          <SelectItem key={program.value} value={program.value}>
                            {program.label}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {errors.enrolmentDetails?.programId && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.enrolmentDetails.programId.message}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Course Offering Selection */}
            {selectedProgramId && (
              <Card>
                <CardHeader>
                  <CardTitle>Course Offering</CardTitle>
                  <CardDescription>
                    Select the specific intake/offering for the program
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div>
                    <Label htmlFor="courseOffering">Course Offering</Label>
                    <Select onValueChange={handleCourseOfferingChange}>
                      <SelectTrigger aria-label="Course Offering" role="combobox" className="mt-2" tabIndex={0}>
                        <SelectValue placeholder="Select a course offering" />
                      </SelectTrigger>
                      <SelectContent>
                        {courseOfferingsLoading ? (
                          <SelectItem value="loading-offerings" disabled>Loading course offerings...</SelectItem>
                        ) : courseOfferings.length === 0 ? (
                          <SelectItem value="no-offerings" disabled>No offerings available</SelectItem>
                        ) : (
                          courseOfferings.map((offering) => (
                            <SelectItem key={offering.value} value={offering.value}>
                              {offering.label}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    {errors.enrolmentDetails?.courseOfferingId && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.enrolmentDetails.courseOfferingId.message}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Subject Selection */}
            {selectedProgramId && (
              <Card>
                <CardHeader>
                  <CardTitle>Subjects</CardTitle>
                  <CardDescription>
                    Select the core and elective subjects
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Core Subjects */}
                  <div>
                    <Label>Core Subjects</Label>
                    <p className="text-sm text-muted-foreground mb-3">
                      Select all core subjects (required for the program)
                    </p>
                    <div className="space-y-2">
                      {subjectsLoading ? (
                        <p className="text-muted-foreground">Loading subjects...</p>
                      ) : coreSubjects.length === 0 ? (
                        <p className="text-muted-foreground">No core subjects available</p>
                      ) : (
                        coreSubjects.map((subject) => (
                          <div key={subject.value} className="flex items-center space-x-2">
                            <Checkbox
                              id={`core-${subject.value}`}
                              checked={selectedCoreSubjects.includes(subject.value)}
                              onCheckedChange={(checked) => 
                                handleCoreSubjectChange(subject.value, checked as boolean)
                              }
                            />
                            <Label htmlFor={`core-${subject.value}`}>
                              {subject.label}
                            </Label>
                          </div>
                        ))
                      )}
                    </div>
                    
                    {selectedCoreSubjects.length > 0 && (
                      <div className="mt-3">
                        <Label>Selected Core Subjects:</Label>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {selectedCoreSubjects.map((subjectId) => {
                            const subject = coreSubjects.find(s => s.value === subjectId);
                            return (
                              <Badge key={subjectId} variant="default">
                                {subject?.label || subjectId}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    
                    {errors.enrolmentDetails?.subjectStructure?.coreSubjectIds && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.enrolmentDetails.subjectStructure.coreSubjectIds.message}
                      </p>
                    )}
                  </div>
                  
                  {/* Elective Subjects */}
                  <div>
                    <Label>Elective Subjects</Label>
                    <p className="text-sm text-muted-foreground mb-3">
                      Select elective subjects (optional)
                    </p>
                    <div className="space-y-2">
                      {subjectsLoading ? (
                        <p className="text-muted-foreground">Loading subjects...</p>
                      ) : electiveSubjects.length === 0 ? (
                        <p className="text-muted-foreground">No elective subjects available</p>
                      ) : (
                        electiveSubjects.map((subject) => (
                          <div key={subject.value} className="flex items-center space-x-2">
                            <Checkbox
                              id={`elective-${subject.value}`}
                              checked={selectedElectiveSubjects.includes(subject.value)}
                              onCheckedChange={(checked) => 
                                handleElectiveSubjectChange(subject.value, checked as boolean)
                              }
                            />
                            <Label htmlFor={`elective-${subject.value}`}>
                              {subject.label}
                            </Label>
                          </div>
                        ))
                      )}
                    </div>
                    
                    {selectedElectiveSubjects.length > 0 && (
                      <div className="mt-3">
                        <Label>Selected Elective Subjects:</Label>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {selectedElectiveSubjects.map((subjectId) => {
                            const subject = electiveSubjects.find(s => s.value === subjectId);
                            return (
                              <Badge key={subjectId} variant="secondary">
                                {subject?.label || subjectId}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Delivery and Funding Information */}
            {selectedProgramId && (
              <Card>
                <CardHeader>
                  <CardTitle>Delivery and Funding</CardTitle>
                  <CardDescription>
                    Additional enrolment details
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="deliveryMode">Delivery Mode</Label>
                      <Select onValueChange={(value) => setValue('enrolmentDetails.deliveryModeId', value)}>
                        <SelectTrigger className="mt-2">
                          <SelectValue placeholder="Select delivery mode" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="face-to-face">Face-to-Face</SelectItem>
                          <SelectItem value="online">Online</SelectItem>
                          <SelectItem value="blended">Blended</SelectItem>
                          <SelectItem value="workplace">Workplace</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.enrolmentDetails?.deliveryModeId && (
                        <p className="text-red-500 text-sm mt-1">
                          {errors.enrolmentDetails.deliveryModeId.message}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor="fundingSource">Funding Source</Label>
                      <Select onValueChange={(value) => setValue('enrolmentDetails.fundingSourceId', value)}>
                        <SelectTrigger className="mt-2">
                          <SelectValue placeholder="Select funding source" />
                        </SelectTrigger>
                        <SelectContent>
                          {fundingSourcesLoading ? (
                            <SelectItem value="loading-funding" disabled>Loading funding sources...</SelectItem>
                          ) : (
                            fundingSources.map((source) => (
                              <SelectItem key={source.value} value={source.value}>
                                {source.label}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      {errors.enrolmentDetails?.fundingSourceId && (
                        <p className="text-red-500 text-sm mt-1">
                          {errors.enrolmentDetails.fundingSourceId.message}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="studyReason">Study Reason</Label>
                      <Select onValueChange={(value) => setValue('enrolmentDetails.studyReasonId', value)}>
                        <SelectTrigger className="mt-2">
                          <SelectValue placeholder="Select study reason" />
                        </SelectTrigger>
                        <SelectContent>
                          {studyReasonsLoading ? (
                            <SelectItem value="loading-reasons" disabled>Loading study reasons...</SelectItem>
                          ) : (
                            studyReasons.map((reason) => (
                              <SelectItem key={reason.value} value={reason.value}>
                                {reason.label}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      {errors.enrolmentDetails?.studyReasonId && (
                        <p className="text-red-500 text-sm mt-1">
                          {errors.enrolmentDetails.studyReasonId.message}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor="deliveryLocation">Delivery Location</Label>
                      <Select onValueChange={(value) => setValue('enrolmentDetails.deliveryLocationId', value)}>
                        <SelectTrigger className="mt-2">
                          <SelectValue placeholder="Select delivery location" />
                        </SelectTrigger>
                        <SelectContent>
                          {locationsLoading ? (
                            <SelectItem value="loading-locations" disabled>Loading locations...</SelectItem>
                          ) : (
                            locations.map((loc) => (
                              <SelectItem key={loc.value} value={loc.value}>
                                {loc.label}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      {errors.enrolmentDetails?.deliveryLocationId && (
                        <p className="text-red-500 text-sm mt-1">
                          {errors.enrolmentDetails.deliveryLocationId.message}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="isVetInSchools"
                      {...register('enrolmentDetails.isVetInSchools')}
                    />
                    <Label htmlFor="isVetInSchools">
                      VET in Schools program
                    </Label>
                  </div>
                </CardContent>
              </Card>
            )}
            
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
