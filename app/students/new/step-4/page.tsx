'use client';

import { useState, useEffect } from 'react';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CalendarIcon, Clock, Users, User } from 'lucide-react';
import { format } from 'date-fns';
import { DatePicker } from '@/components/ui/date-picker';
import { cn } from '@/lib/utils';
import { WizardProgress } from '../components/wizard-progress';
import { SaveDraftButton } from '../components/save-draft-button';
import { useApplicationWizard } from '@/stores/application-wizard';
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
import { 
  useProgramPlanTemplates,
  useProgramPlanSubjects,
  type ProgramPlanTemplate
} from '@/hooks/use-program-plan-templates';
import { useSchedulePreview } from '@/hooks/use-rolling-schedule';
import { useFundingSources, useStudyReasons, transformReferenceData } from '@/hooks/use-reference-data';
import { useLocations, transformLocationsForSelect } from '@/hooks/use-locations';

// =============================================================================
// STEP 3: PROGRAM SELECTION
// Matches backend EnrolmentDetails schema exactly
// =============================================================================

export default function Step4ProgramSelection() {
  const [isNavigating, setIsNavigating] = useState(false);
  const router = useRouter();
  const { updateStep3Data, nextStep, previousStep, draftId, formData, markDirty } = useApplicationWizard();
  
  // Form state
  const [selectedProgramId, setSelectedProgramId] = useState<string>('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [selectedCourseOfferingId, setSelectedCourseOfferingId] = useState<string>('');
  const [selectedIntakeModel, setSelectedIntakeModel] = useState<'Fixed' | 'Rolling' | ''>('');
  const [selectedStartDate, setSelectedStartDate] = useState<Date | undefined>();
  const [selectedCoreSubjects, setSelectedCoreSubjects] = useState<string[]>([]);
  const [selectedElectiveSubjects, setSelectedElectiveSubjects] = useState<string[]>([]);
  
  // Reference data queries
  const { data: programsData, isLoading: programsLoading } = usePrograms();
  const { data: templatesData, isLoading: templatesLoading } = useProgramPlanTemplates(selectedProgramId);
  const { data: templateSubjectsData, isLoading: templateSubjectsLoading } = useProgramPlanSubjects(selectedProgramId, selectedTemplateId);
  const { data: courseOfferingsData, isLoading: courseOfferingsLoading } = useCourseOfferings(selectedProgramId);
  const { data: fundingSourcesData, isLoading: fundingSourcesLoading } = useFundingSources();
  const { data: studyReasonsData, isLoading: studyReasonsLoading } = useStudyReasons();
  const { data: locationsData, isLoading: locationsLoading } = useLocations();
  
  // Progression preview
  const previewSchedule = useSchedulePreview();
  const [rollingPreview, setRollingPreview] = useState<any>(null);
  const [isLoadingProgression, setIsLoadingProgression] = useState(false);
  
  // Transform data for select components
  const programs = transformProgramsForSelect(programsData);
  const templates = templatesData?.data?.map(template => ({
    value: template.id,
    label: `${template.name} (v${template.version})`
  })) || [];
  const courseOfferings = transformCourseOfferingsForSelect(courseOfferingsData);
  const fundingSources = transformReferenceData(fundingSourcesData);
  const studyReasons = transformReferenceData(studyReasonsData);
  const locations = transformLocationsForSelect(locationsData);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    getValues,
  } = useForm<Step3ProgramSelection>({
    defaultValues: {
      enrolmentDetails: {
        programId: (formData as any)?.enrolmentDetails?.programId ?? '',
        programPlanTemplateId: (formData as any)?.enrolmentDetails?.programPlanTemplateId ?? '',
        courseOfferingId: (formData as any)?.enrolmentDetails?.courseOfferingId ?? '',
        intakeModel: (formData as any)?.enrolmentDetails?.intakeModel ?? '',
        subjectStructure: {
          coreSubjectIds: (formData as any)?.enrolmentDetails?.subjectStructure?.coreSubjectIds ?? [],
          electiveSubjectIds: (formData as any)?.enrolmentDetails?.subjectStructure?.electiveSubjectIds ?? [],
        },
        startDate: (formData as any)?.enrolmentDetails?.startDate ?? undefined,
        expectedCompletionDate: (formData as any)?.enrolmentDetails?.expectedCompletionDate ?? undefined,
        deliveryLocationId: (formData as any)?.enrolmentDetails?.deliveryLocationId ?? '',
        deliveryModeId: (formData as any)?.enrolmentDetails?.deliveryModeId ?? '',
        fundingSourceId: (formData as any)?.enrolmentDetails?.fundingSourceId ?? '',
        studyReasonId: (formData as any)?.enrolmentDetails?.studyReasonId ?? '',
        isVetInSchools: (formData as any)?.enrolmentDetails?.isVetInSchools ?? false,
      },
    },
  });

  // Hydrate when formData changes
  useEffect(() => {
    const e = (formData as any)?.enrolmentDetails ?? {};
    setSelectedProgramId(e.programId ?? '');
    setSelectedTemplateId(e.programPlanTemplateId ?? '');
    setSelectedCourseOfferingId(e.courseOfferingId ?? '');
    setSelectedIntakeModel(e.intakeModel ?? '');
    setSelectedStartDate(e.startDate ? new Date(e.startDate) : undefined);
    setSelectedCoreSubjects(e?.subjectStructure?.coreSubjectIds ?? []);
    setSelectedElectiveSubjects(e?.subjectStructure?.electiveSubjectIds ?? []);
    
    setValue('enrolmentDetails.programId', e.programId ?? '');
    setValue('enrolmentDetails.programPlanTemplateId', e.programPlanTemplateId ?? '');
    setValue('enrolmentDetails.courseOfferingId', e.courseOfferingId ?? '');
    setValue('enrolmentDetails.intakeModel', e.intakeModel ?? '');
    setValue('enrolmentDetails.subjectStructure.coreSubjectIds', e?.subjectStructure?.coreSubjectIds ?? []);
    setValue('enrolmentDetails.subjectStructure.electiveSubjectIds', e?.subjectStructure?.electiveSubjectIds ?? []);
    setValue('enrolmentDetails.startDate', e.startDate ?? undefined);
    setValue('enrolmentDetails.expectedCompletionDate', e.expectedCompletionDate ?? undefined);
    setValue('enrolmentDetails.deliveryLocationId', e.deliveryLocationId ?? '');
    setValue('enrolmentDetails.deliveryModeId', e.deliveryModeId ?? '');
    setValue('enrolmentDetails.fundingSourceId', e.fundingSourceId ?? '');
    setValue('enrolmentDetails.studyReasonId', e.studyReasonId ?? '');
    setValue('enrolmentDetails.isVetInSchools', e.isVetInSchools ?? false);
  }, [formData, setValue]);
  
  const watchedValues = watch();
  
  // Mark store as dirty when form values change
  useEffect(() => {
    const subscription = watch((value, { name, type }) => {
      if (type === 'change' && name) {
        markDirty();
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, markDirty]);
  
  // Reset dependent selections when program changes
  useEffect(() => {
    if (selectedProgramId) {
      setSelectedTemplateId('');
      setSelectedCourseOfferingId('');
      setSelectedIntakeModel('');
      setSelectedStartDate(undefined);
      setSelectedCoreSubjects([]);
      setSelectedElectiveSubjects([]);
      setValue('enrolmentDetails.programPlanTemplateId', '');
      setValue('enrolmentDetails.courseOfferingId', '');
      setValue('enrolmentDetails.intakeModel', undefined);
      setValue('enrolmentDetails.startDate', undefined);
      setValue('enrolmentDetails.expectedCompletionDate', undefined);
      setValue('enrolmentDetails.subjectStructure.coreSubjectIds', []);
      setValue('enrolmentDetails.subjectStructure.electiveSubjectIds', []);
    }
  }, [selectedProgramId, setValue]);
  
  const onSubmit: SubmitHandler<Step3ProgramSelection> = async (data) => {
    try {
      // Clean up empty strings for optional fields
      const cleanedData = {
        ...data,
        enrolmentDetails: {
          ...data.enrolmentDetails,
          courseOfferingId: data.enrolmentDetails.courseOfferingId === '' ? undefined : data.enrolmentDetails.courseOfferingId,
        }
      };
      
      // Update wizard state
      updateStep3Data(cleanedData);
      
      // Move to next step
      nextStep();
      
      // Navigate to step 4
      router.push('/students/new/step-5');
    } catch (error) {
      console.error('Error submitting step 3:', error);
    }
  };
  
  const handleNext = async () => {
    setIsNavigating(true);
    await handleSubmit(onSubmit)();
    setIsNavigating(false);
  };
  
  const handlePrevious = () => {
    previousStep();
    router.push('/students/new/step-3');
  };
  
  const handleProgramChange = (programId: string) => {
    setSelectedProgramId(programId);
    setValue('enrolmentDetails.programId', programId);
  };
  
  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    setValue('enrolmentDetails.programPlanTemplateId', templateId);
    
    // Auto-populate subjects from template
    if (templateSubjectsData?.data) {
      const coreSubjects = templateSubjectsData.data
        .filter(subject => subject.unit_type === 'Core')
        .map(subject => subject.subject_id);
      const electiveSubjects = templateSubjectsData.data
        .filter(subject => subject.unit_type === 'Elective')
        .map(subject => subject.subject_id);
      
      setSelectedCoreSubjects(coreSubjects);
      setSelectedElectiveSubjects(electiveSubjects);
      setValue('enrolmentDetails.subjectStructure.coreSubjectIds', coreSubjects);
      setValue('enrolmentDetails.subjectStructure.electiveSubjectIds', electiveSubjects);
    }
    
    // Calculate total duration and set expected completion date if start date is set
    if (selectedStartDate && templateSubjectsData?.data) {
      const totalWeeks = templateSubjectsData.data.reduce((total, subject) => total + subject.duration_weeks, 0);
      const expectedCompletionDate = new Date(selectedStartDate);
      expectedCompletionDate.setDate(expectedCompletionDate.getDate() + (totalWeeks * 7));
      
      setValue('enrolmentDetails.expectedCompletionDate', expectedCompletionDate.toISOString().split('T')[0]);
    }
  };
  
  const handleIntakeModelChange = (model: 'Fixed' | 'Rolling') => {
    setSelectedIntakeModel(model);
    setValue('enrolmentDetails.intakeModel', model);
    
    // Reset course offering and dates when intake model changes
    if (model === 'Rolling') {
      setSelectedCourseOfferingId('');
      setSelectedStartDate(undefined);
      setValue('enrolmentDetails.courseOfferingId', '');
      setValue('enrolmentDetails.startDate', undefined);
      setValue('enrolmentDetails.expectedCompletionDate', undefined);
    }
  };
  
  const handleCourseOfferingChange = (offeringId: string) => {
    setSelectedCourseOfferingId(offeringId);
    setValue('enrolmentDetails.courseOfferingId', offeringId);
    
    // Set start and end dates from course offering
    const offering = courseOfferings.find(o => o.value === offeringId);
    if (offering) {
      setSelectedStartDate(offering.startDate ? new Date(offering.startDate) : undefined);
      setValue('enrolmentDetails.startDate', offering.startDate);
      setValue('enrolmentDetails.expectedCompletionDate', offering.endDate);
    }
  };
  
  const handleStartDateChange = (date: Date | undefined) => {
    setSelectedStartDate(date);
    if (date) {
      setValue('enrolmentDetails.startDate', date.toISOString().split('T')[0]);
      
      // Calculate expected completion date based on template duration
      if (selectedTemplateId && templateSubjectsData?.data) {
        const totalWeeks = templateSubjectsData.data.reduce((total, subject) => total + subject.duration_weeks, 0);
        const expectedCompletionDate = new Date(date);
        expectedCompletionDate.setDate(expectedCompletionDate.getDate() + (totalWeeks * 7));
        setValue('enrolmentDetails.expectedCompletionDate', expectedCompletionDate.toISOString().split('T')[0]);
      }
    } else {
      setValue('enrolmentDetails.startDate', undefined);
      setValue('enrolmentDetails.expectedCompletionDate', undefined);
    }
    // Trigger progression preview update
    fetchProgressionPreview();
  };

  // Function to fetch progression preview
  const fetchProgressionPreview = async () => {
    if (!selectedProgramId || !selectedTemplateId || !selectedIntakeModel) {
      setRollingPreview(null);
      return;
    }

    setIsLoadingProgression(true);
    try {
      if (selectedIntakeModel === 'Rolling') {
        // For now, we'll skip the rolling schedule preview since it requires course plans
        // TODO: Implement rolling schedule preview for Program Plan Templates
        setRollingPreview(null);
      } else {
        setRollingPreview(null);
      }
    } catch (error) {
      console.error('Failed to fetch progression preview:', error);
      setRollingPreview(null);
    } finally {
      setIsLoadingProgression(false);
    }
  };

  // Trigger progression preview when selections change
  useEffect(() => {
    fetchProgressionPreview();
  }, [selectedProgramId, selectedTemplateId, selectedIntakeModel, selectedStartDate]);

  // Auto-populate subjects when template data loads
  useEffect(() => {
    if (selectedTemplateId && templateSubjectsData?.data && templateSubjectsData.data.length > 0) {
      const coreSubjects = templateSubjectsData.data
        .filter(subject => subject.unit_type === 'Core')
        .map(subject => subject.subject_id);
      const electiveSubjects = templateSubjectsData.data
        .filter(subject => subject.unit_type === 'Elective')
        .map(subject => subject.subject_id);
      
      setSelectedCoreSubjects(coreSubjects);
      setSelectedElectiveSubjects(electiveSubjects);
      setValue('enrolmentDetails.subjectStructure.coreSubjectIds', coreSubjects);
      setValue('enrolmentDetails.subjectStructure.electiveSubjectIds', electiveSubjects);
    }
  }, [selectedTemplateId, templateSubjectsData, setValue]);
  
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
            <h1 className="text-3xl font-bold text-foreground">Program & Course Selection</h1>
            <p className="mt-2 text-muted-foreground">Select your program, course plan, and intake model.</p>
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
            
            {/* Program Plan Template Selection */}
            {selectedProgramId && (
              <Card>
                <CardHeader>
                  <CardTitle>Program Plan Template</CardTitle>
                  <CardDescription>
                    Select the program plan template that defines the subjects, structure, and durations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div>
                    <Label htmlFor="template">Program Plan Template</Label>
                    <Select onValueChange={handleTemplateChange}>
                      <SelectTrigger aria-label="Program Plan Template" role="combobox" className="mt-2" tabIndex={0}>
                        <SelectValue placeholder="Select a program plan template" />
                      </SelectTrigger>
                      <SelectContent>
                        {templatesLoading ? (
                          <SelectItem value="loading-templates" disabled>Loading templates...</SelectItem>
                        ) : templates.length === 0 ? (
                          <SelectItem value="no-templates" disabled>No templates available</SelectItem>
                        ) : (
                          templates.map((template) => (
                            <SelectItem key={template.value} value={template.value}>
                              {template.label}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    {errors.enrolmentDetails?.programPlanTemplateId && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.enrolmentDetails.programPlanTemplateId.message}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Intake Model Selection */}
            {selectedProgramId && selectedTemplateId && (
              <Card>
                <CardHeader>
                  <CardTitle>Intake Model</CardTitle>
                  <CardDescription>
                    Choose how you want to progress through the course
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <RadioGroup 
                    value={selectedIntakeModel} 
                    onValueChange={handleIntakeModelChange}
                    className="space-y-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Fixed" id="fixed" />
                      <Label htmlFor="fixed" className="flex items-center space-x-2 cursor-pointer">
                        <Users className="h-4 w-4" />
                        <div>
                          <div className="font-medium">Fixed Intake (Cohort-based)</div>
                          <div className="text-sm text-muted-foreground">
                            Join a group of students with fixed start and end dates
                          </div>
                        </div>
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Rolling" id="rolling" />
                      <Label htmlFor="rolling" className="flex items-center space-x-2 cursor-pointer">
                        <User className="h-4 w-4" />
                        <div>
                          <div className="font-medium">Rolling Intake (Self-paced)</div>
                          <div className="text-sm text-muted-foreground">
                            Start anytime and progress at your own pace
                          </div>
                        </div>
                      </Label>
                    </div>
                  </RadioGroup>
                  {errors.enrolmentDetails?.intakeModel && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.enrolmentDetails.intakeModel.message}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
            
            {/* Course Offering Selection - Only for Fixed Intake */}
            {selectedProgramId && selectedIntakeModel === 'Fixed' && (
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
            
            {/* Start Date Selection - Only for Rolling Intake */}
            {selectedProgramId && selectedIntakeModel === 'Rolling' && (
              <Card>
                <CardHeader>
                  <CardTitle>Start Date</CardTitle>
                  <CardDescription>
                    When would you like to begin your studies? (Optional - you can start anytime)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div>
                    <Label>Preferred Start Date</Label>
                    <div className="mt-2">
                      <DatePicker
                        value={selectedStartDate}
                        onValueChange={handleStartDateChange}
                        placeholder="Select start date"
                        dateFormat="PPP"
                      />
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      You can start immediately or choose a future date. This date can be changed later.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Template Subjects Preview */}
            {selectedProgramId && selectedTemplateId && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Clock className="h-5 w-5" />
                    <span>Template Subjects</span>
                  </CardTitle>
                  <CardDescription>
                    Subjects and durations from the selected program plan template
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {templateSubjectsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-foreground"></div>
                      <span className="ml-3 text-muted-foreground">Loading template subjects...</span>
                    </div>
                  ) : templateSubjectsData?.data && templateSubjectsData.data.length > 0 ? (
                    <div className="space-y-4">
                      <div className="bg-muted/50 rounded-lg p-4">
                        <h4 className="font-semibold mb-2">Template Overview</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Total Units:</span>
                            <span className="ml-2 font-medium">{templateSubjectsData.data.length}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Total Duration:</span>
                            <span className="ml-2 font-medium">
                              {templateSubjectsData.data.reduce((total, subject) => total + subject.duration_weeks, 0)} weeks
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        {templateSubjectsData.data.map((subject, index) => (
                          <div key={subject.subject_id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex-1">
                              <div className="font-medium">{subject.subject_name}</div>
                              <div className="text-sm text-muted-foreground">
                                {subject.subject_identifier}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={subject.unit_type === 'Core' ? 'default' : 'secondary'}>
                                {subject.unit_type}
                              </Badge>
                              <div className="flex items-center gap-1 text-sm">
                                <Clock className="h-3 w-3" />
                                {subject.duration_weeks} week{subject.duration_weeks !== 1 ? 's' : ''}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No subjects found in this template
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Rolling Intake Preview */}
            {selectedProgramId && selectedTemplateId && selectedIntakeModel === 'Rolling' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Clock className="h-5 w-5" />
                    <span>Rolling Intake Preview</span>
                  </CardTitle>
                  <CardDescription>
                    See how your rolling intake progression will work
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingProgression ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-foreground"></div>
                      <span className="ml-3 text-muted-foreground">Loading progression preview...</span>
                    </div>
                  ) : rollingPreview ? (
                    <div className="space-y-3">
                      <div className="text-sm text-muted-foreground">Anchor: {rollingPreview.cycle_anchor_date} • TZ: {rollingPreview.timezone}</div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {rollingPreview.windows.map((w: any, i: number) => (
                          <div key={i} className="rounded border p-3">
                            <div className="text-xs text-muted-foreground">Term {w.term_index + 1}</div>
                            <div className="font-medium">{w.subject_name}</div>
                            <div className="text-sm">{w.start_date} → {w.end_date}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <Alert>
                      <AlertDescription>
                        <strong>Rolling Intake:</strong> You'll progress through subjects individually as you complete them. 
                        Each subject unlocks the next one based on prerequisites. You control your own pace.
                      </AlertDescription>
                    </Alert>
                  )}
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
