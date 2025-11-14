'use client';

import { useRef, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  CommissionsDataTable,
  type CommissionsDataTableRef,
} from './_components/CommissionsDataTable';
import type { CommissionInvoiceFilters } from '@/src/hooks/useGetCommissionInvoices';

export default function CommissionsPage() {
  const tableRef = useRef<CommissionsDataTableRef>(null);
  const [quickStatus, setQuickStatus] = useState<
    'ALL' | 'UNPAID' | 'PAID' | 'CANCELLED'
  >('ALL');

  const effectiveFilters: CommissionInvoiceFilters | undefined =
    quickStatus === 'ALL'
      ? undefined
      : {
          statuses: [quickStatus as 'UNPAID' | 'PAID' | 'CANCELLED'],
        };

  const handleStatusClick = (s: 'ALL' | 'UNPAID' | 'PAID' | 'CANCELLED') => {
    setQuickStatus(s);
  };

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Commissions</h1>
        <p className="text-muted-foreground text-sm">
          View and manage agent commission invoices
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
                variant={quickStatus === 'UNPAID' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleStatusClick('UNPAID')}
              >
                Unpaid
              </Button>
              <Button
                variant={quickStatus === 'PAID' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleStatusClick('PAID')}
              >
                Paid
              </Button>
              <Button
                variant={quickStatus === 'CANCELLED' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleStatusClick('CANCELLED')}
              >
                Cancelled
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <CommissionsDataTable ref={tableRef} filters={effectiveFilters} />
        </CardContent>
      </Card>
    </div>
  );
}
