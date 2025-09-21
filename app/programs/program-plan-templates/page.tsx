"use client";

import { useState } from "react";
import { usePrograms } from "@/hooks/use-programs";
import { 
  useProgramPlanTemplates, 
  useProgramPlanSubjects,
  useCreateProgramPlanTemplate,
  useUpdateProgramPlanSubjects,
  type ProgramPlanSubject,
  type ProgramPlanSubjectInput
} from "@/hooks/use-program-plan-templates";
import { useUnits } from "@/hooks/use-units";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Clock, BookOpen } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

// Form schemas
const createTemplateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  version: z.number().int().min(1),
  isActive: z.boolean(),
});

const addSubjectSchema = z.object({
  subject_id: z.string().min(1, "Subject is required"),
  unit_type: z.enum(['Core', 'Elective']),
  duration_weeks: z.number().int().min(1, "Duration must be at least 1 week"),
  complexity_level: z.enum(['Basic', 'Intermediate', 'Advanced']),
});

type CreateTemplateFormData = z.infer<typeof createTemplateSchema>;
type AddSubjectFormData = z.infer<typeof addSubjectSchema>;

export default function ProgramPlanTemplatesPage() {
  const [selectedProgramId, setSelectedProgramId] = useState<string>("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [isCreateTemplateOpen, setIsCreateTemplateOpen] = useState(false);
  const [isAddSubjectOpen, setIsAddSubjectOpen] = useState(false);

  // Fetch programs
  const { data: programs, isLoading: programsLoading } = usePrograms();

  // Fetch program plan templates
  const { data: templates, isLoading: templatesLoading } = useProgramPlanTemplates(selectedProgramId);

  // Fetch subjects for selected template
  const { data: templateSubjects, isLoading: subjectsLoading } = useProgramPlanSubjects(selectedProgramId, selectedTemplateId);

  // Fetch all units for selection
  const { data: units } = useUnits();

  // Mutations
  const createTemplate = useCreateProgramPlanTemplate();
  const updateSubjects = useUpdateProgramPlanSubjects();

  // Forms
  const createTemplateForm = useForm<CreateTemplateFormData>({
    resolver: zodResolver(createTemplateSchema),
    defaultValues: {
      name: "",
      version: 1,
      isActive: false,
    },
  });

  const addSubjectForm = useForm<AddSubjectFormData>({
    resolver: zodResolver(addSubjectSchema),
    defaultValues: {
      subject_id: "",
      unit_type: "Core",
      duration_weeks: 1,
      complexity_level: "Basic",
    },
  });

  const handleCreateTemplate = async (data: CreateTemplateFormData) => {
    try {
      await createTemplate.mutateAsync({
        programId: selectedProgramId,
        data,
      });
      toast.success("Program plan template created successfully");
      setIsCreateTemplateOpen(false);
      createTemplateForm.reset();
    } catch (error) {
      toast.error("Failed to create template");
      console.error("Create template error:", error);
    }
  };

  const handleAddSubject = async (data: AddSubjectFormData) => {
    try {
      const currentSubjects = templateSubjects?.data || [];
      const newSubject: ProgramPlanSubjectInput = {
        ...data,
        sort_order: currentSubjects.length,
      };

      await updateSubjects.mutateAsync({
        programId: selectedProgramId,
        planId: selectedTemplateId,
        subjects: [...currentSubjects.map(s => ({
          subject_id: s.subject_id,
          unit_type: s.unit_type,
          sort_order: s.sort_order,
          duration_weeks: s.duration_weeks,
        })), newSubject],
      });

      toast.success("Subject added to template successfully");
      setIsAddSubjectOpen(false);
      addSubjectForm.reset();
    } catch (error) {
      toast.error("Failed to add subject");
      console.error("Add subject error:", error);
    }
  };

  const handleRemoveSubject = async (subjectId: string) => {
    try {
      const updatedSubjects = (templateSubjects?.data || [])
        .filter(s => s.subject_id !== subjectId)
        .map(s => ({
          subject_id: s.subject_id,
          unit_type: s.unit_type,
          sort_order: s.sort_order,
          duration_weeks: s.duration_weeks,
        }));

      await updateSubjects.mutateAsync({
        programId: selectedProgramId,
        planId: selectedTemplateId,
        subjects: updatedSubjects,
      });

      toast.success("Subject removed from template");
    } catch (error) {
      toast.error("Failed to remove subject");
      console.error("Remove subject error:", error);
    }
  };

  const calculateTotalDuration = (subjects: ProgramPlanSubject[]) => {
    return subjects.reduce((total, subject) => total + subject.duration_weeks, 0);
  };

  if (programsLoading) {
    return <div className="p-6">Loading programs...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Program Plan Templates</h1>
          <p className="text-muted-foreground">
            Create and manage program plan templates with unit assignments and durations
          </p>
        </div>
      </div>

      {/* Program Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Select Program
          </CardTitle>
          <CardDescription>
            Choose a program to manage its plan templates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedProgramId} onValueChange={setSelectedProgramId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a program" />
            </SelectTrigger>
            <SelectContent>
              {programs?.data?.map((program) => (
                <SelectItem key={program.id} value={program.id}>
                  {program.name} ({program.programCode})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedProgramId && (
        <>
          {/* Templates List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Program Plan Templates</CardTitle>
                  <CardDescription>
                    Manage templates for the selected program
                  </CardDescription>
                </div>
                <Dialog open={isCreateTemplateOpen} onOpenChange={setIsCreateTemplateOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      New Template
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Program Plan Template</DialogTitle>
                      <DialogDescription>
                        Create a new template for this program
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...createTemplateForm}>
                      <form onSubmit={createTemplateForm.handleSubmit(handleCreateTemplate)} className="space-y-4">
                        <FormField
                          control={createTemplateForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Template Name</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., Standard Plan" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={createTemplateForm.control}
                          name="version"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Version</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  min="1" 
                                  {...field} 
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={createTemplateForm.control}
                          name="isActive"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Active</FormLabel>
                              <Select onValueChange={(value) => field.onChange(value === "true")} value={field.value ? "true" : "false"}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="true">Active</SelectItem>
                                  <SelectItem value="false">Inactive</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="outline" onClick={() => setIsCreateTemplateOpen(false)}>
                            Cancel
                          </Button>
                          <Button type="submit" disabled={createTemplate.isPending}>
                            {createTemplate.isPending ? "Creating..." : "Create Template"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {templatesLoading ? (
                <div>Loading templates...</div>
              ) : (
                <div className="space-y-4">
                  {templates?.data?.map((template) => (
                    <Card key={template.id} className="cursor-pointer hover:bg-muted/50">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold">{template.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              Version {template.version}
                              {template.is_active && (
                                <Badge variant="default" className="ml-2">Active</Badge>
                              )}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            onClick={() => setSelectedTemplateId(template.id)}
                          >
                            Manage
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {(!templates?.data || templates.data.length === 0) && (
                    <div className="text-center py-8 text-muted-foreground">
                      No templates found. Create your first template to get started.
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Template Subjects Management */}
          {selectedTemplateId && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Template Subjects
                    </CardTitle>
                    <CardDescription>
                      Manage units and their durations for this template
                    </CardDescription>
                  </div>
                  <Dialog open={isAddSubjectOpen} onOpenChange={setIsAddSubjectOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Unit
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Unit to Template</DialogTitle>
                        <DialogDescription>
                          Add a unit of competency with its duration
                        </DialogDescription>
                      </DialogHeader>
                      <Form {...addSubjectForm}>
                        <form onSubmit={addSubjectForm.handleSubmit(handleAddSubject)} className="space-y-4">
                          <FormField
                            control={addSubjectForm.control}
                            name="subject_id"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Unit of Competency</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select a unit" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {units?.data?.map((unit) => (
                                      <SelectItem key={unit.id} value={unit.id}>
                                        {unit.subject_name} ({unit.subject_identifier})
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={addSubjectForm.control}
                            name="unit_type"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Unit Type</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="Core">Core</SelectItem>
                                    <SelectItem value="Elective">Elective</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={addSubjectForm.control}
                            name="duration_weeks"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Duration (Weeks)</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    min="1" 
                                    placeholder="1"
                                    {...field} 
                                    onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={addSubjectForm.control}
                            name="complexity_level"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Complexity Level</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="Basic">Basic</SelectItem>
                                    <SelectItem value="Intermediate">Intermediate</SelectItem>
                                    <SelectItem value="Advanced">Advanced</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => setIsAddSubjectOpen(false)}>
                              Cancel
                            </Button>
                            <Button type="submit" disabled={updateSubjects.isPending}>
                              {updateSubjects.isPending ? "Adding..." : "Add Unit"}
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {subjectsLoading ? (
                  <div>Loading subjects...</div>
                ) : (
                  <>
                    {templateSubjects?.data && templateSubjects.data.length > 0 && (
                      <div className="mb-4 p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span className="font-medium">
                            Total Duration: {calculateTotalDuration(templateSubjects.data)} weeks
                          </span>
                        </div>
                      </div>
                    )}
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Unit Code</TableHead>
                          <TableHead>Unit Name</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Duration</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {templateSubjects?.data?.map((subject) => (
                          <TableRow key={subject.subject_id}>
                            <TableCell className="font-mono text-sm">
                              {subject.subject_identifier}
                            </TableCell>
                            <TableCell>{subject.subject_name}</TableCell>
                            <TableCell>
                              <Badge variant={subject.unit_type === 'Core' ? 'default' : 'secondary'}>
                                {subject.unit_type}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {subject.duration_weeks} week{subject.duration_weeks !== 1 ? 's' : ''}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveSubject(subject.subject_id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {(!templateSubjects?.data || templateSubjects.data.length === 0) && (
                      <div className="text-center py-8 text-muted-foreground">
                        No units added to this template yet. Add units to get started.
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
