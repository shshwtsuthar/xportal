'use client';

import { useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DepositsDataTable,
  type DepositsDataTableRef,
} from './_components/DepositsDataTable';
import { DepositsColumnsMenu } from './_components/DepositsColumnsMenu';
import { DepositsFilter } from './_components/DepositsFilter';
import { DepositStats } from './_components/DepositStats';
import { useDepositsFilters } from '@/src/hooks/useDepositsFilters';
import { useGetApplicationInvoices } from '@/src/hooks/useGetApplicationInvoices';

export default function DepositsPage() {
  const tableRef = useRef<DepositsDataTableRef>(null);

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
    // For payment statuses
    return {
      ...filters,
      internalPaymentStatuses: [
        quickStatus as 'UNPAID' | 'PARTIALLY_PAID' | 'PAID_INTERNAL',
      ],
    };
  }, [filters, quickStatus]);

  // Fetch all deposits for stats
  const { data: allDeposits, isLoading } = useGetApplicationInvoices();

  const handleStatusClick = (
    s:
      | 'ALL'
      | 'SCHEDULED'
      | 'VOID'
      | 'UNPAID'
      | 'PARTIALLY_PAID'
      | 'PAID_INTERNAL'
  ) => {
    setQuickStatus(s);
  };

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Deposits</h1>
        <p className="text-muted-foreground text-sm">
          View and manage application deposit invoices and payments
        </p>
      </div>

      {/* Deposit Statistics Cards */}
      <div className="mb-6">
        {isLoading ? (
          <p className="text-muted-foreground text-sm">Loading statistics...</p>
        ) : (
          <DepositStats deposits={allDeposits ?? []} />
        )}
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
            </div>
            <div className="flex items-center gap-2">
              <DepositsFilter
                filters={filters}
                onApply={updateFilters}
                onReset={resetFilters}
                activeFilterCount={activeFilterCount}
              />
              <DepositsColumnsMenu />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DepositsDataTable ref={tableRef} filters={effectiveFilters} />
        </CardContent>
      </Card>
    </div>
  );
}
