'use client';

import { useMemo } from 'react';
import { StatCard } from '@/components/ui/stat-card';
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
      <StatCard
        title="Total Deposits"
        value={String(stats.totalDeposits)}
        icon={FileText}
      />
      <StatCard
        title="Unpaid Deposits"
        value={String(stats.unpaidDeposits)}
        icon={DollarSign}
      />
      <StatCard
        title="Total Amount Due"
        value={formatCurrency(stats.totalAmountDueDollars)}
        icon={DollarSign}
      />
      <StatCard
        title="Issued This Week"
        value={String(stats.issuedThisWeek)}
        icon={TrendingUp}
      />
    </div>
  );
}
