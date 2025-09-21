'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage,
  FormDescription
} from '@/components/ui/form';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCreateProgram } from '@/hooks/use-programs';
import { toast } from 'sonner';
import { Plus, Info, BookOpen, Building, MapPin } from 'lucide-react';

// Comprehensive NAT00030 validation schema
const programSchema = z.object({
  // Basic fields
  program_identifier: z.string().min(1, "Program identifier is required").max(10, "Must be 10 characters or less"),
  program_name: z.string().min(1, "Program name is required").max(200, "Must be 200 characters or less"),
  status: z.enum(['Current', 'Superseded', 'Archived']),
  tga_url: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  
  // NAT00030 Required Fields
  program_level_of_education_identifier: z.string().min(3).max(3, "Must be exactly 3 characters"),
  program_field_of_education_identifier: z.string().min(4).max(4, "Must be exactly 4 characters"),
  program_recognition_identifier: z.string().min(2).max(2, "Must be exactly 2 characters"),
  vet_flag: z.enum(['Y', 'N']),
  nominal_hours: z.number().int().min(0, "Must be a positive number"),
  
  // NAT00030 Optional Fields
  anzsco_identifier: z.string().min(6).max(6, "Must be exactly 6 characters").optional().or(z.literal("")),
  anzsic_identifier: z.string().min(4).max(4, "Must be exactly 4 characters").optional().or(z.literal("")),
});

type ProgramFormData = z.infer<typeof programSchema>;

// NAT00030 reference data
const AQF_LEVELS = [
  { value: '000', label: '000 - Not applicable' },
  { value: '405', label: '405 - Certificate IV' },
  { value: '420', label: '420 - Diploma' },
  { value: '510', label: '510 - Advanced Diploma' },
  { value: '610', label: '610 - Associate Degree' },
  { value: '620', label: '620 - Bachelor Degree' },
  { value: '710', label: '710 - Masters Degree' },
  { value: '810', label: '810 - Doctoral Degree' },
];

const FIELD_OF_EDUCATION = [
  { value: '0000', label: '0000 - Not applicable' },
  { value: '0801', label: '0801 - Business and Management' },
  { value: '0803', label: '0803 - Economics and Econometrics' },
  { value: '0805', label: '0805 - Sales and Marketing' },
  { value: '0807', label: '0807 - Tourism' },
  { value: '0809', label: '0809 - Office Studies' },
  { value: '0811', label: '0811 - Banking, Finance and Related Fields' },
  { value: '0903', label: '0903 - Education' },
  { value: '1001', label: '1001 - Engineering and Related Technologies' },
  { value: '1101', label: '1101 - Food, Hospitality and Personal Services' },
];

const RECOGNITION_IDENTIFIERS = [
  { value: '01', label: '01 - Nationally Recognised' },
  { value: '02', label: '02 - State Recognised' },
  { value: '03', label: '03 - Institution Recognised' },
  { value: '04', label: '04 - Not Recognised' },
];

interface CreateProgramDialogProps {
  children?: React.ReactNode;
}

export const CreateProgramDialog = ({ children }: CreateProgramDialogProps) => {
  const [open, setOpen] = useState(false);
  const createProgram = useCreateProgram();

  // Form for creating new programs with full NAT00030 compliance
  const form = useForm<ProgramFormData>({
    resolver: zodResolver(programSchema),
    defaultValues: {
      program_identifier: '',
      program_name: '',
      status: 'Current',
      tga_url: '',
      program_level_of_education_identifier: '420',
      program_field_of_education_identifier: '0801',
      program_recognition_identifier: '01',
      vet_flag: 'Y',
      nominal_hours: 1200,
      anzsco_identifier: '',
      anzsic_identifier: '',
    },
  });

  const onSubmit = async (data: ProgramFormData) => {
    try {
      // Prepare data for API call
      const programData = {
        program_identifier: data.program_identifier,
        program_name: data.program_name,
        status: data.status,
        tga_url: data.tga_url || undefined,
        program_level_of_education_identifier: data.program_level_of_education_identifier,
        program_field_of_education_identifier: data.program_field_of_education_identifier,
        program_recognition_identifier: data.program_recognition_identifier,
        vet_flag: data.vet_flag,
        nominal_hours: data.nominal_hours,
        anzsco_identifier: data.anzsco_identifier || undefined,
        anzsic_identifier: data.anzsic_identifier || undefined,
      };
      
      await createProgram.mutateAsync(programData);
      toast.success('Program created successfully with full NAT00030 compliance');
      setOpen(false);
      form.reset();
    } catch (error) {
      toast.error('Failed to create program');
      console.error('Create program error:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Program
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Create New Program
          </DialogTitle>
          <DialogDescription>
            Add a new program with full NAT00030 compliance. All fields marked with * are required for AVETMISS reporting.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="nat00030">NAT00030 Fields</TabsTrigger>
                <TabsTrigger value="optional">Optional Fields</TabsTrigger>
              </TabsList>
              
              {/* Basic Information Tab */}
              <TabsContent value="basic" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Basic Program Information</CardTitle>
                    <CardDescription>
                      Essential details for program identification and management
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="program_identifier"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Program Identifier *</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., BSB50420" {...field} />
                          </FormControl>
                          <FormDescription>
                            Unique identifier for the program (max 10 characters)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="program_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Program Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Certificate IV in Leadership and Management" {...field} />
                          </FormControl>
                          <FormDescription>
                            Full name of the program (max 200 characters)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Status</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Current">Current</SelectItem>
                                <SelectItem value="Superseded">Superseded</SelectItem>
                                <SelectItem value="Archived">Archived</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="tga_url"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Training.gov.au URL</FormLabel>
                            <FormControl>
                              <Input placeholder="https://training.gov.au/..." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              {/* NAT00030 Required Fields Tab */}
              <TabsContent value="nat00030" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Building className="h-5 w-5" />
                      NAT00030 Required Fields
                    </CardTitle>
                    <CardDescription>
                      Mandatory fields for AVETMISS compliance reporting
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="program_level_of_education_identifier"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>AQF Level Identifier *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select AQF level" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {AQF_LEVELS.map((level) => (
                                  <SelectItem key={level.value} value={level.value}>
                                    {level.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Australian Qualifications Framework level
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="program_field_of_education_identifier"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Field of Education *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select field" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {FIELD_OF_EDUCATION.map((field) => (
                                  <SelectItem key={field.value} value={field.value}>
                                    {field.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              ASCED field of education classification
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="program_recognition_identifier"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Recognition Status *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select recognition" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {RECOGNITION_IDENTIFIERS.map((recognition) => (
                                  <SelectItem key={recognition.value} value={recognition.value}>
                                    {recognition.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Program recognition status
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="vet_flag"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>VET Flag *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select VET flag" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Y">Y - Yes (VET Program)</SelectItem>
                                <SelectItem value="N">N - No (Non-VET Program)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Vocational Education and Training indicator
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="nominal_hours"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nominal Hours *</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="1200" 
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormDescription>
                            Total program duration in hours
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
              
              {/* Optional Fields Tab */}
              <TabsContent value="optional" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      Optional NAT00030 Fields
                    </CardTitle>
                    <CardDescription>
                      Additional fields for enhanced reporting and classification
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="anzsco_identifier"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>ANZSCO Code</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., 141111" {...field} />
                            </FormControl>
                            <FormDescription>
                              Australian and New Zealand Standard Classification of Occupations
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="anzsic_identifier"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>ANZSIC Code</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., 8021" {...field} />
                            </FormControl>
                            <FormDescription>
                              Australian and New Zealand Standard Industrial Classification
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <div className="flex items-start gap-2">
                        <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                        <div className="text-sm text-blue-800">
                          <p className="font-medium mb-1">NAT00030 Compliance Information</p>
                          <p>All required fields must be completed for AVETMISS reporting compliance. Optional fields provide additional classification for enhanced reporting and analysis.</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createProgram.isPending}>
                {createProgram.isPending ? 'Creating...' : 'Create Program'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};