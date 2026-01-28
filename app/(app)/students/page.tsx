'use client';

import { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  StudentsDataTable,
  type StudentsDataTableRef,
} from './_components/StudentsDataTable';
import { StudentsFilter } from './_components/StudentsFilter';
import { StudentsColumnsMenu } from './_components/StudentsColumnsMenu';
import { ExportDialog } from './_components/ExportDialog';
import { StudentStats } from './_components/StudentStats';
import { Download, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStudentsFilters } from '@/src/hooks/useStudentsFilters';
import { useGetStudentStats } from '@/src/hooks/useGetStudentStats';
import { useComposeEmail } from '@/components/providers/compose-email';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { PageContainer } from '@/components/page-container';
import type { Database } from '@/database.types';

type StudentStatus = Database['public']['Enums']['student_status'];

export default function StudentsPage() {
  const tableRef = useRef<StudentsDataTableRef>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const { openWithRecipients } = useComposeEmail();
  const getRowsForExport = useCallback(() => {
    return tableRef.current?.getRows() ?? [];
  }, []);
  const { filters, updateFilters, resetFilters, activeFilterCount } =
    useStudentsFilters();
  const [quickStatus, setQuickStatus] = useState<StudentStatus | undefined>(
    filters.statuses?.length === 1 ? filters.statuses[0] : undefined
  );

  // Fetch optimized stats (uses aggregation instead of fetching all rows)
  const { data: stats, isLoading: statsLoading } = useGetStudentStats();

  // Handle quick status tab clicks
  const handleStatusClick = (status: StudentStatus | undefined) => {
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

  // Handle mail button click
  const handleMailClick = () => {
    const rows = tableRef.current?.getRows() ?? [];
    const emails = Array.from(
      new Set(rows.map((r) => r.email).filter(Boolean))
    ) as string[];

    if (emails.length === 0) {
      toast.error('No email addresses found in filtered students');
      return;
    }

    openWithRecipients(emails);
  };

  // Current effective filters (combining quick status with other filters)
  const effectiveFilters = quickStatus
    ? { ...filters, statuses: [quickStatus] }
    : filters;

  return (
    <PageContainer title="Students" description="View and manage students">
      {/* Student Statistics Cards */}
      <div className="mb-6">
        {statsLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Card key={index}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-4 rounded" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : stats ? (
          <StudentStats stats={stats} />
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold tracking-tight">
            All Students
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
                variant={quickStatus === 'ACTIVE' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleStatusClick('ACTIVE')}
              >
                Active
              </Button>
              <Button
                variant={quickStatus === 'INACTIVE' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleStatusClick('INACTIVE')}
              >
                Inactive
              </Button>
              <Button
                variant={quickStatus === 'COMPLETED' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleStatusClick('COMPLETED')}
              >
                Completed
              </Button>
              <Button
                variant={quickStatus === 'WITHDRAWN' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleStatusClick('WITHDRAWN')}
              >
                Withdrawn
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleMailClick}
                aria-label="Email filtered students"
              >
                <Mail className="mr-2 h-4 w-4" /> Mail
              </Button>
              <StudentsFilter
                filters={filters}
                onApply={updateFilters}
                onReset={resetFilters}
                activeFilterCount={activeFilterCount}
              />
              <StudentsColumnsMenu />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setExportOpen(true)}
                aria-label="Export students"
              >
                <Download className="mr-2 h-4 w-4" /> Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <StudentsDataTable ref={tableRef} filters={effectiveFilters} />
        </CardContent>
      </Card>

      <ExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        getRows={getRowsForExport}
        filters={effectiveFilters}
      />
    </PageContainer>
  );
}
