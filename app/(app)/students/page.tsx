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
import { useGetStudents } from '@/src/hooks/useGetStudents';
import { useComposeEmail } from '@/components/providers/compose-email';
import { toast } from 'sonner';
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

  // Fetch all students for stats
  const { data: allStudents, isLoading } = useGetStudents();

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
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Students</h1>
          <p className="text-muted-foreground text-sm">
            View and manage students
          </p>
        </div>
      </div>

      {/* Student Statistics Cards */}
      <div className="mb-6">
        {isLoading ? (
          <p className="text-muted-foreground text-sm">Loading statistics...</p>
        ) : (
          <StudentStats students={allStudents ?? []} />
        )}
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
    </div>
  );
}
