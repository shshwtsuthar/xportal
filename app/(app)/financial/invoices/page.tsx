'use client';

import { useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import {
  InvoicesDataTable,
  type InvoicesDataTableRef,
} from './_components/InvoicesDataTable';
import { InvoicesColumnsMenu } from './_components/InvoicesColumnsMenu';
import { InvoicesFilter } from './_components/InvoicesFilter';
import { ExportDialogInvoices } from './_components/ExportDialogInvoices';
import { useInvoicesFilters } from '@/src/hooks/useInvoicesFilters';

export default function InvoicesPage() {
  const tableRef = useRef<InvoicesDataTableRef>(null);
  const [exportOpen, setExportOpen] = useState(false);

  const { filters, updateFilters, resetFilters, activeFilterCount } =
    useInvoicesFilters();

  const [quickStatus, setQuickStatus] = useState<
    'ALL' | 'OVERDUE' | 'PAID' | 'SCHEDULED'
  >('ALL');
  const effectiveFilters = useMemo(() => {
    if (quickStatus === 'ALL') return filters;
    return {
      ...filters,
      statuses: [quickStatus as 'OVERDUE' | 'PAID' | 'SCHEDULED'],
    };
  }, [filters, quickStatus]);

  const handleStatusClick = (s: 'ALL' | 'OVERDUE' | 'PAID' | 'SCHEDULED') => {
    setQuickStatus(s);
  };

  const getRowsForExport = () => tableRef.current?.getRows() ?? [];

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Invoices</h1>
        <p className="text-muted-foreground text-sm">
          View and manage student invoices and payments
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant={quickStatus === 'ALL' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleStatusClick('ALL')}
              >
                All
              </Button>
              <Button
                variant={quickStatus === 'OVERDUE' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleStatusClick('OVERDUE')}
              >
                Overdue
              </Button>
              <Button
                variant={quickStatus === 'PAID' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleStatusClick('PAID')}
              >
                Paid
              </Button>
              <Button
                variant={quickStatus === 'SCHEDULED' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleStatusClick('SCHEDULED')}
              >
                Scheduled
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <InvoicesFilter
                filters={filters}
                onApply={updateFilters}
                onReset={resetFilters}
                activeFilterCount={activeFilterCount}
              />
              <InvoicesColumnsMenu />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setExportOpen(true)}
                aria-label="Export invoices"
              >
                <Download className="mr-2 h-4 w-4" /> Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <InvoicesDataTable ref={tableRef} filters={effectiveFilters} />
        </CardContent>
      </Card>

      <ExportDialogInvoices
        open={exportOpen}
        onOpenChange={setExportOpen}
        getRows={getRowsForExport}
        filters={effectiveFilters}
      />
    </div>
  );
}
