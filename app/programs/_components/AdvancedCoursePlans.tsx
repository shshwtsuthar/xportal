"use client";

import { useState, useMemo, useEffect } from "react";
import { 
  useCoursePlans, 
  useCreateCoursePlan, 
  usePlanSubjects, 
  useReplacePlanSubjects,
  useCoursePlanStructure,
  useUpdateCoursePlanPrerequisites,
  useValidateCoursePlanProgression,
  usePreviewCoursePlanProgression,
  type PlanSubjectItem,
  type PrerequisiteItem,
  type CoursePlanStructure,
  type ProgressionPreview
} from "@/hooks/use-course-plans";
import { useProgramSubjects } from "@/hooks/use-programs";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, ChevronUp, ChevronDown, Trash2, Play, AlertTriangle, CheckCircle, Clock, Users, Calendar } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";

type Props = { programId: string };

export const AdvancedCoursePlans = ({ programId }: Props) => {
  const { data: plans } = useCoursePlans(programId);
  const createPlan = useCreateCoursePlan();
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const { data: planSubjects } = usePlanSubjects(programId, selectedPlanId);
  const { data: subjects } = useProgramSubjects(programId);
  const replacePlanSubjects = useReplacePlanSubjects();
  const { data: structure } = useCoursePlanStructure(programId, selectedPlanId);
  const updatePrerequisites = useUpdateCoursePlanPrerequisites();
  const validateProgression = useValidateCoursePlanProgression();
  const previewProgression = usePreviewCoursePlanProgression();

  // Create plan dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [planName, setPlanName] = useState<string>("");
  const [planVersion, setPlanVersion] = useState<number>(1);
  const [createAsActive, setCreateAsActive] = useState(false);

  // Advanced editor state
  const [editorOpen, setEditorOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"subjects" | "prerequisites" | "preview">("subjects");
  const [subjectsData, setSubjectsData] = useState<PlanSubjectItem[]>([]);
  const [prerequisitesData, setPrerequisitesData] = useState<PrerequisiteItem[]>([]);
  const [previewData, setPreviewData] = useState<ProgressionPreview | null>(null);

  // Form validation
  const PlanSchema = z.object({ 
    name: z.string().min(1, "Plan name is required"), 
    version: z.number().int().positive("Version must be positive") 
  });
  const form = useForm<z.infer<typeof PlanSchema>>({ 
    resolver: zodResolver(PlanSchema), 
    defaultValues: { name: "", version: 1 } 
  });

  // Load data when plan is selected
  useEffect(() => {
    if (selectedPlanId && structure) {
      setSubjectsData(structure.subjects.map(s => ({
        subject_id: s.subject_id,
        unit_type: s.unit_type,
        sort_order: s.sort_order,
        estimated_duration_weeks: s.estimated_duration_weeks || 4,
        complexity_level: s.complexity_level || 'Basic'
      })));
      setPrerequisitesData(structure.prerequisites.map(p => ({
        subject_id: p.subject_id,
        prerequisite_subject_id: p.prerequisite_subject_id,
        prerequisite_type: p.prerequisite_type
      })));
    }
  }, [selectedPlanId, structure]);

  const grouped = useMemo(() => {
    const core = (subjects?.data ?? []).filter(s => s.isCore);
    const electives = (subjects?.data ?? []).filter(s => !s.isCore);
    const selected = new Set((planSubjects ?? []).map(s => s.subject_id));
    return { core, electives, selected };
  }, [subjects, planSubjects]);

  // Calculate totals and statistics
  const totalDuration = useMemo(() => 
    subjectsData.reduce((sum, s) => sum + (s.estimated_duration_weeks || 4), 0), 
    [subjectsData]
  );

  const complexityBreakdown = useMemo(() => {
    const breakdown = { Basic: 0, Intermediate: 0, Advanced: 0 };
    subjectsData.forEach(s => {
      const level = s.complexity_level || 'Basic';
      breakdown[level]++;
    });
    return breakdown;
  }, [subjectsData]);

  const handleCreatePlan = () => {
    if (!programId || !planName.trim()) {
      toast.error('Plan name is required');
      return;
    }
    
    createPlan.mutate(
      { 
        programId, 
        name: planName.trim(), 
        version: planVersion,
        isActive: createAsActive 
      },
      { 
        onSuccess: () => { 
          toast.success('Plan created successfully'); 
          setCreateDialogOpen(false); 
          setPlanName(""); 
          setPlanVersion(1);
          setCreateAsActive(false);
        }, 
        onError: () => toast.error('Failed to create plan') 
      }
    );
  };

  const handleOpenEditor = (planId: string) => {
    setSelectedPlanId(planId);
    setEditorOpen(true);
    setActiveTab("subjects");
  };

  const handleSaveSubjects = () => {
    if (!selectedPlanId || !programId) return;
    
    // Validate subjects
    if (subjectsData.length === 0) {
      toast.error('Add at least one subject to the plan');
      return;
    }

    for (const subject of subjectsData) {
      if (!subject.subject_id) {
        toast.error('All subjects must have a valid subject ID');
        return;
      }
      if (!subject.estimated_duration_weeks || subject.estimated_duration_weeks < 1) {
        toast.error('All subjects must have a valid duration (minimum 1 week)');
        return;
      }
    }

    replacePlanSubjects.mutate(
      { programId, planId: selectedPlanId, items: subjectsData },
      { 
        onSuccess: () => { 
          toast.success('Subjects saved successfully');
          if (structure?.progression_validation.is_valid === false) {
            toast.warning('Progression validation failed. Check prerequisites.');
          }
        }, 
        onError: () => toast.error('Failed to save subjects') 
      }
    );
  };

  const handleSavePrerequisites = () => {
    if (!selectedPlanId || !programId) return;

    // Validate prerequisites
    for (const prereq of prerequisitesData) {
      if (prereq.subject_id === prereq.prerequisite_subject_id) {
        toast.error('Subject cannot be a prerequisite of itself');
        return;
      }
    }

    updatePrerequisites.mutate(
      { programId, planId: selectedPlanId, prerequisites: prerequisitesData },
      { 
        onSuccess: () => { 
          toast.success('Prerequisites saved successfully');
        }, 
        onError: () => toast.error('Failed to save prerequisites') 
      }
    );
  };

  const handleValidateProgression = () => {
    if (!selectedPlanId || !programId) return;

    validateProgression.mutate(
      { programId, planId: selectedPlanId },
      {
        onSuccess: (result) => {
          if (result.is_valid) {
            toast.success('Progression rules are valid');
          } else {
            toast.error(`Validation failed: ${result.errors.map(e => e.message).join(', ')}`);
          }
        },
        onError: () => toast.error('Failed to validate progression')
      }
    );
  };

  const handlePreviewProgression = (intakeModel: 'Fixed' | 'Rolling') => {
    if (!selectedPlanId || !programId) return;

    previewProgression.mutate(
      { 
        programId, 
        planId: selectedPlanId, 
        intake_model: intakeModel,
        simulation_duration_weeks: 52
      },
      {
        onSuccess: (result) => {
          setPreviewData(result);
          setActiveTab("preview");
          toast.success(`${intakeModel} intake preview generated`);
        },
        onError: () => toast.error('Failed to generate preview')
      }
    );
  };

  const addSubject = (subjectId: string, unitType: 'Core' | 'Elective') => {
    const newSubject: PlanSubjectItem = {
      subject_id: subjectId,
      unit_type: unitType,
      sort_order: subjectsData.length + 1,
      estimated_duration_weeks: 4,
      complexity_level: 'Basic'
    };
    setSubjectsData(prev => [...prev, newSubject]);
  };

  const removeSubject = (index: number) => {
    setSubjectsData(prev => prev.filter((_, i) => i !== index));
    // Remove any prerequisites that reference this subject
    setPrerequisitesData(prev => prev.filter(p => 
      p.subject_id !== subjectsData[index].subject_id && 
      p.prerequisite_subject_id !== subjectsData[index].subject_id
    ));
  };

  const addPrerequisite = () => {
    const newPrereq: PrerequisiteItem = {
      subject_id: "",
      prerequisite_subject_id: "",
      prerequisite_type: 'Required'
    };
    setPrerequisitesData(prev => [...prev, newPrereq]);
  };

  const removePrerequisite = (index: number) => {
    setPrerequisitesData(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      {/* Header with Create Plan Dialog */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Advanced Course Plans</h2>
          <p className="text-muted-foreground">Design sophisticated course structures with prerequisites and progression rules</p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Plan
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Course Plan</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Plan Name</label>
                <Input 
                  placeholder="e.g., Certificate III in Carpentry - Standard Path"
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Version</label>
                <Input 
                  type="number" 
                  min="1"
                  value={planVersion}
                  onChange={(e) => setPlanVersion(Number(e.target.value))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-sm font-medium">Make Active</div>
                  <div className="text-xs text-muted-foreground">Sets this as the active plan for the program</div>
                </div>
                <Switch 
                  checked={createAsActive} 
                  onCheckedChange={setCreateAsActive} 
                  aria-label="Make active plan" 
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreatePlan}>Create Plan</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Plans Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Course Plans
              </CardTitle>
              <CardDescription>
                Manage course structures and progression rules
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!plans && (
                <div className="space-y-2">
                  {Array.from({length: 3}).map((_, i) => (
                    <div key={i} className="h-12 bg-muted rounded animate-pulse" />
                  ))}
                </div>
              )}
              {plans?.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No course plans yet. Create your first plan to get started.
                </p>
              )}
              {!!plans && plans.length > 0 && (
                <div className="space-y-2">
                  {plans.map(plan => (
                    <div 
                      key={plan.id} 
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedPlanId === plan.id ? 'bg-primary/10 border-primary' : 'hover:bg-muted/50'
                      }`}
                      onClick={() => setSelectedPlanId(plan.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{plan.name}</div>
                          <div className="text-sm text-muted-foreground">v{plan.version}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={plan.is_active ? "default" : "secondary"}>
                            {plan.is_active ? "Active" : "Draft"}
                          </Badge>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEditor(plan.id);
                            }}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          {!selectedPlanId ? (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-center space-y-2">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto" />
                  <h3 className="text-lg font-medium">Select a Course Plan</h3>
                  <p className="text-sm text-muted-foreground">
                    Choose a plan from the list to view and edit its structure
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Plan Structure</CardTitle>
                <CardDescription>
                  {selectedPlanId && plans?.find(p => p.id === selectedPlanId)?.name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {structure && (
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold text-primary">{structure.subjects.length}</div>
                      <div className="text-sm text-muted-foreground">Subjects</div>
                    </div>
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold text-primary">
                        {structure.subjects.reduce((sum, s) => sum + (s.estimated_duration_weeks || 4), 0)}
                      </div>
                      <div className="text-sm text-muted-foreground">Total Weeks</div>
                    </div>
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold text-primary">{structure.prerequisites.length}</div>
                      <div className="text-sm text-muted-foreground">Prerequisites</div>
                    </div>
                  </div>
                )}
                
                {structure?.progression_validation && (
                  <Alert className={`mb-6 ${structure.progression_validation.is_valid ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                    {structure.progression_validation.is_valid ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                    )}
                    <AlertDescription className={structure.progression_validation.is_valid ? 'text-green-800' : 'text-red-800'}>
                      {structure.progression_validation.is_valid 
                        ? 'Progression rules are valid' 
                        : `Validation errors: ${structure.progression_validation.errors.map(e => e.message).join(', ')}`
                      }
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => handleOpenEditor(selectedPlanId)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Edit Structure
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={handleValidateProgression}
                    disabled={validateProgression.isPending}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Validate Rules
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline">
                        <Play className="h-4 w-4 mr-2" />
                        Preview Progression
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => handlePreviewProgression('Fixed')}>
                        Fixed Intake Preview
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handlePreviewProgression('Rolling')}>
                        Rolling Intake Preview
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Advanced Editor Modal */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="w-[95vw] sm:max-w-6xl p-0">
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b p-4">
            <DialogHeader>
              <DialogTitle>Advanced Course Plan Editor</DialogTitle>
            </DialogHeader>
          </div>
          
          <div className="p-4 max-h-[80vh] overflow-y-auto">
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="space-y-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="subjects">Subjects & Structure</TabsTrigger>
                <TabsTrigger value="prerequisites">Prerequisites</TabsTrigger>
                <TabsTrigger value="preview">Progression Preview</TabsTrigger>
              </TabsList>

              <TabsContent value="subjects" className="space-y-4">
                {/* Subjects Editor - Similar to Payment Templates */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium">Course Structure</h3>
                      <p className="text-sm text-muted-foreground">
                        Total duration: {totalDuration} weeks | 
                        Complexity: {complexityBreakdown.Basic} Basic, {complexityBreakdown.Intermediate} Intermediate, {complexityBreakdown.Advanced} Advanced
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">Add Subjects</Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuLabel>Core Subjects</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {grouped.core.filter(s => !subjectsData.some(sub => sub.subject_id === s.id)).map(subject => (
                            <DropdownMenuItem 
                              key={subject.id}
                              onClick={() => addSubject(subject.id, 'Core')}
                            >
                              {subject.code} - {subject.name}
                            </DropdownMenuItem>
                          ))}
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel>Elective Subjects</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {grouped.electives.filter(s => !subjectsData.some(sub => sub.subject_id === s.id)).map(subject => (
                            <DropdownMenuItem 
                              key={subject.id}
                              onClick={() => addSubject(subject.id, 'Elective')}
                            >
                              {subject.code} - {subject.name}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Subjects List */}
                  <div className="space-y-2">
                    {subjectsData.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No subjects added yet. Use "Add Subjects" to get started.
                      </p>
                    )}
                    {subjectsData.map((subject, idx) => {
                      const subjectInfo = subjects?.data?.find(s => s.id === subject.subject_id);
                      return (
                        <div key={idx} className="grid grid-cols-12 gap-3 items-center border rounded-md p-3">
                          <div className="col-span-12 md:col-span-4 min-w-0">
                            <label className="text-xs text-muted-foreground">Subject</label>
                            <div className="font-medium">
                              {subjectInfo ? `${subjectInfo.code} - ${subjectInfo.name}` : 'Unknown Subject'}
                            </div>
                            <Badge variant={subject.unit_type === 'Core' ? 'default' : 'secondary'} className="mt-1">
                              {subject.unit_type}
                            </Badge>
                          </div>
                          <div className="col-span-6 md:col-span-2">
                            <label className="text-xs text-muted-foreground">Duration (weeks)</label>
                            <Input
                              type="number"
                              min="1"
                              value={subject.estimated_duration_weeks || 4}
                              onChange={(e) => {
                                const newSubjects = [...subjectsData];
                                newSubjects[idx].estimated_duration_weeks = Number(e.target.value);
                                setSubjectsData(newSubjects);
                              }}
                            />
                          </div>
                          <div className="col-span-6 md:col-span-2">
                            <label className="text-xs text-muted-foreground">Complexity</label>
                            <Select 
                              value={subject.complexity_level || 'Basic'}
                              onValueChange={(value: 'Basic' | 'Intermediate' | 'Advanced') => {
                                const newSubjects = [...subjectsData];
                                newSubjects[idx].complexity_level = value;
                                setSubjectsData(newSubjects);
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Basic">Basic</SelectItem>
                                <SelectItem value="Intermediate">Intermediate</SelectItem>
                                <SelectItem value="Advanced">Advanced</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="col-span-12 md:col-span-2 flex md:items-end justify-end gap-2 flex-wrap">
                            <Button 
                              variant="outline" 
                              size="icon" 
                              aria-label="Move up"
                              onClick={() => {
                                if (idx > 0) {
                                  const newSubjects = [...subjectsData];
                                  [newSubjects[idx], newSubjects[idx - 1]] = [newSubjects[idx - 1], newSubjects[idx]];
                                  setSubjectsData(newSubjects);
                                }
                              }}
                              disabled={idx === 0}
                            >
                              <ChevronUp className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="icon" 
                              aria-label="Move down"
                              onClick={() => {
                                if (idx < subjectsData.length - 1) {
                                  const newSubjects = [...subjectsData];
                                  [newSubjects[idx], newSubjects[idx + 1]] = [newSubjects[idx + 1], newSubjects[idx]];
                                  setSubjectsData(newSubjects);
                                }
                              }}
                              disabled={idx === subjectsData.length - 1}
                            >
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="icon" 
                              aria-label="Remove"
                              onClick={() => removeSubject(idx)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="prerequisites" className="space-y-4">
                {/* Prerequisites Editor */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium">Prerequisite Rules</h3>
                      <p className="text-sm text-muted-foreground">
                        Define which subjects must be completed before others can begin
                      </p>
                    </div>
                    <Button size="sm" onClick={addPrerequisite}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Prerequisite
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {prerequisitesData.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No prerequisites defined yet. Add prerequisite rules to control subject progression.
                      </p>
                    )}
                    {prerequisitesData.map((prereq, idx) => {
                      const subjectInfo = subjects?.data?.find(s => s.id === prereq.subject_id);
                      const prereqInfo = subjects?.data?.find(s => s.id === prereq.prerequisite_subject_id);
                      
                      return (
                        <div key={idx} className="grid grid-cols-12 gap-3 items-center border rounded-md p-3">
                          <div className="col-span-12 md:col-span-4 min-w-0">
                            <label className="text-xs text-muted-foreground">Subject</label>
                            <Select 
                              value={prereq.subject_id}
                              onValueChange={(value) => {
                                const newPrereqs = [...prerequisitesData];
                                newPrereqs[idx].subject_id = value;
                                setPrerequisitesData(newPrereqs);
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select subject" />
                              </SelectTrigger>
                              <SelectContent>
                                {subjectsData.map(subject => {
                                  const info = subjects?.data?.find(s => s.id === subject.subject_id);
                                  return (
                                    <SelectItem key={subject.subject_id} value={subject.subject_id}>
                                      {info ? `${info.code} - ${info.name}` : 'Unknown Subject'}
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="col-span-12 md:col-span-4 min-w-0">
                            <label className="text-xs text-muted-foreground">Prerequisite</label>
                            <Select 
                              value={prereq.prerequisite_subject_id}
                              onValueChange={(value) => {
                                const newPrereqs = [...prerequisitesData];
                                newPrereqs[idx].prerequisite_subject_id = value;
                                setPrerequisitesData(newPrereqs);
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select prerequisite" />
                              </SelectTrigger>
                              <SelectContent>
                                {subjectsData
                                  .filter(subject => subject.subject_id !== prereq.subject_id)
                                  .map(subject => {
                                    const info = subjects?.data?.find(s => s.id === subject.subject_id);
                                    return (
                                      <SelectItem key={subject.subject_id} value={subject.subject_id}>
                                        {info ? `${info.code} - ${info.name}` : 'Unknown Subject'}
                                      </SelectItem>
                                    );
                                  })}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="col-span-6 md:col-span-2">
                            <label className="text-xs text-muted-foreground">Type</label>
                            <Select 
                              value={prereq.prerequisite_type}
                              onValueChange={(value: 'Required' | 'Recommended') => {
                                const newPrereqs = [...prerequisitesData];
                                newPrereqs[idx].prerequisite_type = value;
                                setPrerequisitesData(newPrereqs);
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Required">Required</SelectItem>
                                <SelectItem value="Recommended">Recommended</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="col-span-6 md:col-span-2 flex md:items-end justify-end">
                            <Button 
                              variant="outline" 
                              size="icon" 
                              aria-label="Remove"
                              onClick={() => removePrerequisite(idx)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="preview" className="space-y-4">
                {/* Progression Preview */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium">Progression Preview</h3>
                      <p className="text-sm text-muted-foreground">
                        See how students will progress through the course in different intake models
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handlePreviewProgression('Fixed')}
                        disabled={previewProgression.isPending}
                      >
                        <Calendar className="h-4 w-4 mr-2" />
                        Fixed Intake
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handlePreviewProgression('Rolling')}
                        disabled={previewProgression.isPending}
                      >
                        <Clock className="h-4 w-4 mr-2" />
                        Rolling Intake
                      </Button>
                    </div>
                  </div>

                  {previewData && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                          <div className="text-2xl font-bold text-primary">{previewData.total_duration_weeks}</div>
                          <div className="text-sm text-muted-foreground">Total Weeks</div>
                        </div>
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                          <div className="text-2xl font-bold text-primary">{previewData.progression_phases.length}</div>
                          <div className="text-sm text-muted-foreground">Phases</div>
                        </div>
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                          <div className="text-2xl font-bold text-primary">
                            {previewData.intake_model}
                          </div>
                          <div className="text-sm text-muted-foreground">Intake Model</div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className="font-medium">Progression Phases</h4>
                        {previewData.progression_phases.map((phase, idx) => (
                          <Card key={idx}>
                            <CardHeader className="pb-3">
                              <CardTitle className="text-base">Phase {phase.phase_number}</CardTitle>
                              <CardDescription>
                                Weeks {phase.estimated_start_week}-{phase.estimated_end_week} 
                                ({phase.estimated_end_week - phase.estimated_start_week + 1} weeks)
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              <div className="flex flex-wrap gap-2">
                                {phase.subject_ids.map(subjectId => {
                                  const subjectInfo = subjects?.data?.find(s => s.id === subjectId);
                                  return (
                                    <Badge key={subjectId} variant="outline">
                                      {subjectInfo ? `${subjectInfo.code}` : `Subject ${subjectId.slice(0, 8)}`}
                                    </Badge>
                                  );
                                })}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {!previewData && (
                    <div className="text-center py-12">
                      <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h4 className="font-medium mb-2">No Preview Generated</h4>
                      <p className="text-sm text-muted-foreground mb-4">
                        Generate a progression preview to see how students will advance through the course
                      </p>
                      <div className="flex gap-2 justify-center">
                        <Button 
                          variant="outline" 
                          onClick={() => handlePreviewProgression('Fixed')}
                          disabled={previewProgression.isPending}
                        >
                          Preview Fixed Intake
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => handlePreviewProgression('Rolling')}
                          disabled={previewProgression.isPending}
                        >
                          Preview Rolling Intake
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <div className="sticky bottom-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t p-4">
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setEditorOpen(false)}>
                Cancel
              </Button>
              {activeTab === "subjects" && (
                <Button onClick={handleSaveSubjects} disabled={replacePlanSubjects.isPending}>
                  Save Subjects
                </Button>
              )}
              {activeTab === "prerequisites" && (
                <Button onClick={handleSavePrerequisites} disabled={updatePrerequisites.isPending}>
                  Save Prerequisites
                </Button>
              )}
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
