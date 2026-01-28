'use client';

import { useMemo } from 'react';
import { StatCard } from '@/components/ui/stat-card';
import { FileText, AlertCircle, DollarSign, TrendingUp } from 'lucide-react';
import { startOfWeek, isAfter } from 'date-fns';
import type { Tables } from '@/database.types';

type InvoiceRow = Tables<'enrollment_invoices'> & {
  enrollments?: {
    student_id: string;
    program_id: string;
    students?: Pick<
      Tables<'students'>,
      'first_name' | 'last_name' | 'student_id_display' | 'id'
    > | null;
    programs?: Pick<Tables<'programs'>, 'name' | 'code' | 'id'> | null;
  } | null;
};

type Props = {
  invoices: InvoiceRow[];
};

export function InvoiceStats({ invoices }: Props) {
  const stats = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday

    const totalInvoices = invoices.length;
    const overdueInvoices = invoices.filter(
      (invoice) => invoice.status === 'OVERDUE'
    ).length;

    // Total amount due: sum of (amount_due_cents - amount_paid_cents) for all unpaid invoices (status !== 'PAID')
    const totalAmountDue = invoices
      .filter((invoice) => invoice.status !== 'PAID')
      .reduce((sum, invoice) => {
        const amountDue = invoice.amount_due_cents ?? 0;
        const amountPaid = invoice.amount_paid_cents ?? 0;
        return sum + (amountDue - amountPaid);
      }, 0);

    // Convert cents to dollars
    const totalAmountDueDollars = totalAmountDue / 100;

    const issuedThisWeek = invoices.filter(
      (invoice) =>
        invoice.issue_date && isAfter(new Date(invoice.issue_date), weekStart)
    ).length;

    return {
      totalInvoices,
      overdueInvoices,
      totalAmountDueDollars,
      issuedThisWeek,
    };
  }, [invoices]);

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
        title="Total Invoices"
        value={String(stats.totalInvoices)}
        icon={FileText}
      />
      <StatCard
        title="Overdue Invoices"
        value={String(stats.overdueInvoices)}
        icon={AlertCircle}
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
