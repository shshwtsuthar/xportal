'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  BookOpenText, 
  CalendarDays, 
  CreditCard,
  AlertCircle,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProgramSelector } from './_components/ProgramSelector';
import { CoursePlans } from './_components/CoursePlans';
import { PaymentTemplates } from './_components/PaymentTemplates';
import { Offerings } from './_components/Offerings';
import { usePrograms } from '@/hooks/use-programs';

export default function ProgramsPage() {
  const [selectedProgramId, setSelectedProgramId] = useState<string>('');
  
  // Get programs for selector
  const { data: programs, isLoading: programsLoading, isError: programsError } = usePrograms();

  if (programsLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        {/* Header Skeleton */}
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
        </div>

        {/* Stats Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (programsError) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Programs & Courses</h1>
            <p className="text-muted-foreground">Manage programs, course plans, payment templates, and offerings</p>
          </div>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Error loading programs: {String(programsError) || 'Unknown error'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const selectedProgram = programs?.data?.find((p: any) => p.id === selectedProgramId);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Programs & Courses</h1>
          <p className="text-muted-foreground">Manage programs, course plans, payment templates, and offerings</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Program
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Programs
            </CardTitle>
            <div className="p-2 rounded-full bg-muted">
              <BookOpenText className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {programs?.data?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Active programs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Course Plans
            </CardTitle>
            <div className="p-2 rounded-full bg-muted">
              <CalendarDays className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              --
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Default study plans
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Payment Templates
            </CardTitle>
            <div className="p-2 rounded-full bg-muted">
              <CreditCard className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              --
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Payment plan templates
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Program Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Select Program</CardTitle>
        </CardHeader>
        <CardContent>
          <ProgramSelector 
            programs={programs?.data || []} 
            selectedProgramId={selectedProgramId}
            onProgramSelect={setSelectedProgramId}
          />
        </CardContent>
      </Card>

      {/* Main Content */}
      {selectedProgramId ? (
        <Card>
          <CardHeader>
            <CardTitle>
              {selectedProgram?.name || 'Program Management'}
              {selectedProgram && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  - {selectedProgram.programCode}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="course-plans" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="course-plans">Course Plans</TabsTrigger>
                <TabsTrigger value="payment-templates">Payment Templates</TabsTrigger>
                <TabsTrigger value="offerings">Offerings</TabsTrigger>
              </TabsList>
              
              <TabsContent value="course-plans" className="mt-6">
                <CoursePlans programId={selectedProgramId} />
              </TabsContent>
              
              <TabsContent value="payment-templates" className="mt-6">
                <PaymentTemplates programId={selectedProgramId} />
              </TabsContent>
              
              <TabsContent value="offerings" className="mt-6">
                <Offerings programId={selectedProgramId} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <BookOpenText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">Select a Program</h3>
            <p className="text-muted-foreground">
              Choose a program from the dropdown above to manage its course plans, payment templates, and offerings.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}