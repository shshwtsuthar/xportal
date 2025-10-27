'use client';

import { useState, useRef, useCallback } from 'react';
import type { Database } from '@/database.types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ApplicationsDataTable,
  type ApplicationsDataTableRef,
} from './_components/ApplicationsDataTable';
import { ApplicationStats } from './_components/ApplicationStats';
import { ApplicationsFilter } from './_components/ApplicationsFilter';
import { ApplicationsColumnsMenu } from './_components/ApplicationsColumnsMenu';
import { ExportDialog } from './_components/ExportDialog';
import { Download } from 'lucide-react';
import { useGetApplications } from '@/src/hooks/useGetApplications';
import { useApplicationsFilters } from '@/src/hooks/useApplicationsFilters';
import Link from 'next/link';
import { Plus } from 'lucide-react';

type ApplicationStatus = Database['public']['Enums']['application_status'];

export default function ApplicationsPage() {
  const tableRef = useRef<ApplicationsDataTableRef>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const getRowsForExport = useCallback(() => {
    return tableRef.current?.getRows() ?? [];
  }, []);
  const { filters, updateFilters, resetFilters, activeFilterCount } =
    useApplicationsFilters();
  const [quickStatus, setQuickStatus] = useState<ApplicationStatus | undefined>(
    filters.statuses?.length === 1 ? filters.statuses[0] : undefined
  );

  // Fetch all applications for stats
  const { data: allApplications, isLoading } = useGetApplications();

  // Handle quick status tab clicks
  const handleStatusClick = (status: ApplicationStatus | undefined) => {
    setQuickStatus(status);
    // Update filters to include this status, preserving other filters
    const newFilters = { ...filters };
    if (status) {
      newFilters.statuses = [status];
    } else {
      delete newFilters.statuses;
    }
    updateFilters(newFilters);
  };

  // Current effective filters (combining quick status with other filters)
  const effectiveFilters = quickStatus
    ? { ...filters, statuses: [quickStatus] }
    : filters;

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Applications
          </h1>
          <p className="text-muted-foreground text-sm">
            View and manage student applications
          </p>
        </div>
        <Button asChild>
          <Link href="/applications/new">
            <Plus className="mr-2 h-4 w-4" />
            New Application
          </Link>
        </Button>
      </div>

      {/* Application Statistics Cards */}
      <div className="mb-6">
        {isLoading ? (
          <p className="text-muted-foreground text-sm">Loading statistics...</p>
        ) : (
          <ApplicationStats applications={allApplications ?? []} />
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold tracking-tight">
            All Applications
          </CardTitle>
          <div className="mt-4 flex items-center justify-between gap-2">
            <div className="flex flex-wrap gap-2">
              <Button
                variant={quickStatus === undefined ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleStatusClick(undefined)}
              >
                All
              </Button>
              <Button
                variant={quickStatus === 'DRAFT' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleStatusClick('DRAFT')}
              >
                Draft
              </Button>
              <Button
                variant={quickStatus === 'SUBMITTED' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleStatusClick('SUBMITTED')}
              >
                Submitted
              </Button>
              <Button
                variant={
                  quickStatus === 'OFFER_GENERATED' ? 'default' : 'outline'
                }
                size="sm"
                onClick={() => handleStatusClick('OFFER_GENERATED')}
              >
                Offer Generated
              </Button>
              <Button
                variant={quickStatus === 'OFFER_SENT' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleStatusClick('OFFER_SENT')}
              >
                Offer Sent
              </Button>
              <Button
                variant={quickStatus === 'ACCEPTED' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleStatusClick('ACCEPTED')}
              >
                Accepted
              </Button>
              <Button
                variant={quickStatus === 'APPROVED' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleStatusClick('APPROVED')}
              >
                Approved
              </Button>
              <Button
                variant={quickStatus === 'REJECTED' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleStatusClick('REJECTED')}
              >
                Rejected
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <ApplicationsFilter
                filters={filters}
                onApply={updateFilters}
                onReset={resetFilters}
                activeFilterCount={activeFilterCount}
              />
              <ApplicationsColumnsMenu />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setExportOpen(true)}
                aria-label="Export applications"
              >
                <Download className="mr-2 h-4 w-4" /> Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ApplicationsDataTable ref={tableRef} filters={effectiveFilters} />
        </CardContent>
      </Card>

      {/* Chart removed per request */}

      <ExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        getRows={getRowsForExport}
        filters={effectiveFilters}
      />
    </div>
  );
}
