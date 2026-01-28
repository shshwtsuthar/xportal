'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DepositsDataTable,
  type DepositsDataTableRef,
} from './_components/DepositsDataTable';
import { DepositsColumnsMenu } from './_components/DepositsColumnsMenu';
import { DepositsFilter } from './_components/DepositsFilter';
import { DepositStats } from './_components/DepositStats';
import { ExportDialog } from './_components/ExportDialog';
import { useDepositsFilters } from '@/src/hooks/useDepositsFilters';
import { useGetApplicationInvoices } from '@/src/hooks/useGetApplicationInvoices';
import { PageContainer } from '@/components/page-container';
import { Download } from 'lucide-react';

export default function DepositsPage() {
  const tableRef = useRef<DepositsDataTableRef>(null);
  const [exportOpen, setExportOpen] = useState(false);

  const { filters, updateFilters, resetFilters, activeFilterCount } =
    useDepositsFilters();

  const [quickStatus, setQuickStatus] = useState<
    'ALL' | 'SCHEDULED' | 'VOID' | 'UNPAID' | 'PARTIALLY_PAID' | 'PAID_INTERNAL'
  >('ALL');

  const effectiveFilters = useMemo(() => {
    if (quickStatus === 'ALL') return filters;

    if (quickStatus === 'SCHEDULED' || quickStatus === 'VOID') {
      return {
        ...filters,
        statuses: [quickStatus],
      };
    }

    return {
      ...filters,
      internalPaymentStatuses: [
        quickStatus as 'UNPAID' | 'PARTIALLY_PAID' | 'PAID_INTERNAL',
      ],
    };
  }, [filters, quickStatus]);

  const { data: allDeposits, isLoading } = useGetApplicationInvoices();

  const getRowsForExport = useCallback(() => {
    return tableRef.current?.getRows() ?? [];
  }, []);

  const handleStatusClick = (
    status:
      | 'ALL'
      | 'SCHEDULED'
      | 'VOID'
      | 'UNPAID'
      | 'PARTIALLY_PAID'
      | 'PAID_INTERNAL'
  ) => {
    setQuickStatus(status);
  };

  return (
    <PageContainer
      title="Deposits"
      description="View and manage application deposit invoices and payments"
    >
      <div className="mb-8">
        {isLoading ? (
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
        ) : (
          <DepositStats deposits={allDeposits ?? []} />
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold tracking-tight">
            All Deposits
          </CardTitle>
          <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <ButtonGroup className="flex-wrap">
              <Button
                variant={quickStatus === 'ALL' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleStatusClick('ALL')}
              >
                All
              </Button>
              <Button
                variant={quickStatus === 'SCHEDULED' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleStatusClick('SCHEDULED')}
              >
                Scheduled
              </Button>
              <Button
                variant={quickStatus === 'VOID' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleStatusClick('VOID')}
              >
                Void
              </Button>
              <Button
                variant={quickStatus === 'UNPAID' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleStatusClick('UNPAID')}
              >
                Unpaid
              </Button>
              <Button
                variant={
                  quickStatus === 'PARTIALLY_PAID' ? 'default' : 'outline'
                }
                size="sm"
                onClick={() => handleStatusClick('PARTIALLY_PAID')}
              >
                Partially Paid
              </Button>
              <Button
                variant={
                  quickStatus === 'PAID_INTERNAL' ? 'default' : 'outline'
                }
                size="sm"
                onClick={() => handleStatusClick('PAID_INTERNAL')}
              >
                Paid
              </Button>
            </ButtonGroup>
            <div className="flex flex-wrap items-center gap-2 md:justify-end">
              <DepositsFilter
                filters={filters}
                onApply={updateFilters}
                onReset={resetFilters}
                activeFilterCount={activeFilterCount}
              />
              <DepositsColumnsMenu />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setExportOpen(true)}
                aria-label="Export deposits"
              >
                <Download className="mr-2 h-4 w-4" /> Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="w-full overflow-x-auto">
            <DepositsDataTable ref={tableRef} filters={effectiveFilters} />
          </div>
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
