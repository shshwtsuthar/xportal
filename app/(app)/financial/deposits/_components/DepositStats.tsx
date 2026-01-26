'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, DollarSign, TrendingUp, CheckCircle2 } from 'lucide-react';
import { startOfWeek, isAfter } from 'date-fns';
import type { Tables } from '@/database.types';

type ApplicationInvoiceRow = Tables<'application_invoices'> & {
  applications?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    student_id_display: string | null;
    program_id: string | null;
    programs?: Pick<Tables<'programs'>, 'name' | 'code' | 'id'> | null;
  } | null;
};

type Props = {
  deposits: ApplicationInvoiceRow[];
};

export function DepositStats({ deposits }: Props) {
  const stats = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday

    const totalDeposits = deposits.length;

    // Unpaid deposits (internal_payment_status = UNPAID)
    const unpaidDeposits = deposits.filter(
      (deposit) => deposit.internal_payment_status === 'UNPAID'
    ).length;

    // Partially paid deposits
    const partiallyPaidDeposits = deposits.filter(
      (deposit) => deposit.internal_payment_status === 'PARTIALLY_PAID'
    ).length;

    // Fully paid deposits (internal only)
    const paidDeposits = deposits.filter(
      (deposit) => deposit.internal_payment_status === 'PAID_INTERNAL'
    ).length;

    // Total amount due: sum of (amount_due_cents - amount_paid_cents) for all unpaid/partially paid deposits
    const totalAmountDue = deposits
      .filter(
        (deposit) =>
          deposit.internal_payment_status === 'UNPAID' ||
          deposit.internal_payment_status === 'PARTIALLY_PAID'
      )
      .reduce((sum, deposit) => {
        const amountDue = deposit.amount_due_cents ?? 0;
        const amountPaid = deposit.amount_paid_cents ?? 0;
        return sum + (amountDue - amountPaid);
      }, 0);

    // Convert cents to dollars
    const totalAmountDueDollars = totalAmountDue / 100;

    const issuedThisWeek = deposits.filter(
      (deposit) =>
        deposit.issue_date && isAfter(new Date(deposit.issue_date), weekStart)
    ).length;

    return {
      totalDeposits,
      unpaidDeposits,
      partiallyPaidDeposits,
      paidDeposits,
      totalAmountDueDollars,
      issuedThisWeek,
    };
  }, [deposits]);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-muted-foreground text-sm font-medium">
            Total Deposits
          </CardTitle>
          <FileText className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-semibold tracking-tight">
            {stats.totalDeposits}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-muted-foreground text-sm font-medium">
            Unpaid Deposits
          </CardTitle>
          <DollarSign className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-semibold tracking-tight">
            {stats.unpaidDeposits}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-muted-foreground text-sm font-medium">
            Total Amount Due
          </CardTitle>
          <DollarSign className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-semibold tracking-tight">
            {formatCurrency(stats.totalAmountDueDollars)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-muted-foreground text-sm font-medium">
            Issued This Week
          </CardTitle>
          <TrendingUp className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-semibold tracking-tight">
            {stats.issuedThisWeek}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
