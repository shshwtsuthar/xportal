/**
 * AVETMISS Compliance Page
 * 
 * Main page for AVETMISS compliance status and NAT file downloads.
 * Displays status cards for NAT00010 (Organisation) and NAT00020 (Locations).
 */

'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Download, 
  RefreshCw, 
  Loader2,
  AlertCircle,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import { useAvetmissStatus, useAvetmissStatusRefresh } from '@/hooks/use-avetmiss-status';
import { useNATDownloads } from '@/hooks/use-nat-downloads';
import { NATFileStatusCard } from '@/components/nat-file-status-card';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function AVETMISSCompliancePage() {
  const { 
    data: statusData, 
    isLoading, 
    error, 
    refetch 
  } = useAvetmissStatus();
  
  const { refreshStatus } = useAvetmissStatusRefresh();
  const { downloadAll, isDownloadingAll } = useNATDownloads();

  const handleRefresh = async () => {
    try {
      await refetch();
      toast.success('Status refreshed successfully');
    } catch (error) {
      toast.error('Failed to refresh status');
    }
  };

  const handleDownloadAll = async () => {
    try {
      await downloadAll();
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  // Calculate overall status
  const getOverallStatus = () => {
    if (isLoading) return 'loading';
    if (error) return 'error';
    if (!statusData) return 'no_data';
    
    const { nat00010Status, nat00020Status } = statusData;
    
    if (nat00010Status.isComplete && nat00020Status.isComplete) {
      return 'complete';
    } else if (nat00010Status.status === 'error' || nat00020Status.status === 'error') {
      return 'error';
    } else {
      return 'incomplete';
    }
  };

  const overallStatus = getOverallStatus();
  const canDownloadAll = statusData?.nat00010Status.isComplete && statusData?.nat00020Status.isComplete && !isDownloadingAll;

  // Status badge configuration following design system patterns
  const getStatusBadge = () => {
    switch (overallStatus) {
      case 'complete':
        return {
          variant: 'default' as const,
          className: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
          icon: CheckCircle2,
          text: 'Ready'
        };
      case 'incomplete':
        return {
          variant: 'outline' as const,
          className: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
          icon: AlertCircle,
          text: 'Incomplete'
        };
      case 'error':
        return {
          variant: 'destructive' as const,
          className: '',
          icon: AlertCircle,
          text: 'Error'
        };
      default:
        return {
          variant: 'secondary' as const,
          className: '',
          icon: Loader2,
          text: 'Loading'
        };
    }
  };

  const statusBadge = getStatusBadge();

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-96">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading AVETMISS compliance status...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-96">
          <Card className="max-w-md">
            <CardContent className="flex flex-col items-center gap-4 text-center">
              <div className="flex items-center justify-center size-12 rounded-xl bg-destructive/10 text-destructive">
                <AlertCircle className="size-6" />
              </div>
              <div>
                <CardTitle className="text-destructive">Failed to Load Status</CardTitle>
                <CardDescription className="mt-1">
                  Unable to load AVETMISS compliance status. Please try again.
                </CardDescription>
              </div>
              <Button onClick={handleRefresh} variant="outline" className="w-full">
                <RefreshCw className="size-4 mr-2" />
                Retry
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Page Header - Following design system layout patterns */}
      <div className="flex flex-col gap-6 mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-12 rounded-xl bg-primary/10 text-primary">
              <FileText className="size-6" />
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">AVETMISS Compliance</h1>
              <p className="text-sm text-muted-foreground">
                Monitor data completeness and download NAT files for government reporting
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Overall Status Badge - Using design system status colors */}
            <Badge 
              variant={statusBadge.variant}
              className={cn("gap-1", statusBadge.className)}
            >
              <statusBadge.icon className={cn(
                "size-3",
                overallStatus === 'loading' && "animate-spin"
              )} />
              {statusBadge.text}
            </Badge>

            {/* Refresh Button - Following button design system */}
            <Button
              onClick={handleRefresh}
              variant="outline"
              size="sm"
              disabled={isLoading}
            >
              <RefreshCw className={cn("size-4 mr-2", isLoading && "animate-spin")} />
              Refresh
            </Button>

            {/* Download All Button - Primary action styling */}
            {canDownloadAll && (
              <Button
                onClick={handleDownloadAll}
                disabled={isDownloadingAll}
                size="sm"
              >
                {isDownloadingAll ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-2" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="size-4 mr-2" />
                    Download All
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Status Summary Cards - Following card design system */}
        {statusData && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="flex items-center gap-3">
                <div className="flex items-center justify-center size-8 rounded-lg bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400">
                  <CheckCircle2 className="size-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">Complete Files</p>
                  <p className="text-xs text-muted-foreground">
                    {[statusData.nat00010Status, statusData.nat00020Status]
                      .filter(status => status.isComplete).length} of 2
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center gap-3">
                <div className="flex items-center justify-center size-8 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                  <FileText className="size-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">Total Records</p>
                  <p className="text-xs text-muted-foreground">
                    {statusData.nat00010Status.recordCount + statusData.nat00020Status.recordCount} records
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center gap-3">
                <div className="flex items-center justify-center size-8 rounded-lg bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400">
                  <AlertCircle className="size-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">Missing Fields</p>
                  <p className="text-xs text-muted-foreground">
                    {statusData.nat00010Status.missingFields.length + statusData.nat00020Status.missingFields.length} fields
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* NAT File Status Cards - Grid layout following design system */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {statusData?.nat00010Status && (
          <NATFileStatusCard
            fileType="NAT00010"
            status={statusData.nat00010Status}
            onDownload={() => {}} // Handled by the card component
            isDownloading={false} // Handled by the card component
            organisationData={statusData.organisationData}
          />
        )}

        {statusData?.nat00020Status && (
          <NATFileStatusCard
            fileType="NAT00020"
            status={statusData.nat00020Status}
            onDownload={() => {}} // Handled by the card component
            isDownloading={false} // Handled by the card component
          />
        )}
      </div>

      {/* Help Section - Following card structure and typography */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="size-5" />
            AVETMISS File Information
          </CardTitle>
          <CardDescription>
            Understanding NAT files and compliance requirements
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="font-medium text-sm">NAT00010 - Organisation</h4>
              <p className="text-xs text-muted-foreground">
                Contains training organisation details including address, contact information, and RTO identifier.
              </p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Single record per organisation</li>
                <li>• Required for all AVETMISS submissions</li>
                <li>• Must match training.gov.au data</li>
              </ul>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-medium text-sm">NAT00020 - Locations</h4>
              <p className="text-xs text-muted-foreground">
                Contains delivery location details for all training activities and assessment locations.
              </p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• One record per delivery location</li>
                <li>• Required for location-based reporting</li>
                <li>• Must include complete address details</li>
              </ul>
            </div>
          </div>
          
          <div className="pt-4 border-t">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ExternalLink className="size-3" />
              <span>
                For detailed AVETMISS specifications, visit the{' '}
                <a 
                  href="https://www.ncver.edu.au/data-and-research/avetmiss" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline underline-offset-4"
                >
                  NCVER AVETMISS documentation
                </a>
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
