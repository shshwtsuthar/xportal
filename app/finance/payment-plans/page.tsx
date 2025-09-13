'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CreditCard, 
  AlertCircle,
  Plus,
  TrendingUp,
  DollarSign,
  FileText,
  Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProgramSelector } from '@/app/programs/_components/ProgramSelector';
import { AdvancedPaymentTemplates } from './_components/AdvancedPaymentTemplates';
import { usePrograms } from '@/hooks/use-programs';

export default function PaymentPlansPage() {
  const [selectedProgramId, setSelectedProgramId] = useState<string>('');
  
  // Get programs for selector
  const { data: programs, isLoading: programsLoading, isError: programsError, error: programsErrorDetails } = usePrograms();

  if (programsLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        {/* Header Skeleton */}
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>

        {/* Stats Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
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

        {/* Content Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-32 w-full" />
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
            <h1 className="text-3xl font-bold tracking-tight">Payment Plans</h1>
            <p className="text-muted-foreground">Manage payment templates and instalment plans</p>
          </div>
        </div>

        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load programs. Please try refreshing the page.
            {programsErrorDetails && (
              <details className="mt-2">
                <summary className="cursor-pointer text-sm">Error details</summary>
                <pre className="mt-1 text-xs bg-destructive/10 p-2 rounded overflow-auto">
                  {programsErrorDetails.message}
                </pre>
              </details>
            )}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payment Plans</h1>
          <p className="text-muted-foreground">Manage payment templates and instalment plans for your programs</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Template
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Templates
            </CardTitle>
            <div className="p-2 rounded-full bg-muted">
              <FileText className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {programs?.data?.reduce((acc, program) => acc + (program.payment_templates_count || 0), 0) || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all programs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Programs
            </CardTitle>
            <div className="p-2 rounded-full bg-muted">
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{programs?.data?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              With payment plans
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Default Templates
            </CardTitle>
            <div className="p-2 rounded-full bg-muted">
              <Settings className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {programs?.data?.filter(p => p.default_payment_template).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Programs with defaults
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Revenue
            </CardTitle>
            <div className="p-2 rounded-full bg-muted">
              <DollarSign className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$0</div>
            <p className="text-xs text-muted-foreground">
              From payment plans
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Program Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CreditCard className="h-5 w-5" />
            <span>Program Selection</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ProgramSelector
            programs={programs?.data || []}
            selectedProgramId={selectedProgramId}
            onProgramSelect={setSelectedProgramId}
            placeholder="Select a program to manage its payment plans..."
          />
        </CardContent>
      </Card>

      {/* Payment Templates Management */}
      {selectedProgramId ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CreditCard className="h-5 w-5" />
              <span>Payment Templates</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AdvancedPaymentTemplates programId={selectedProgramId} />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">Select a Program</h3>
            <p className="text-muted-foreground">
              Choose a program from the dropdown above to manage its payment templates and instalment plans.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}