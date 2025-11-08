'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, AlertCircle, DollarSign, TrendingUp } from 'lucide-react';
import { startOfWeek, isAfter } from 'date-fns';
import type { Tables } from '@/database.types';

type InvoiceRow = Tables<'invoices'> & {
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
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-muted-foreground text-sm font-medium">
            Total Invoices
          </CardTitle>
          <FileText className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-semibold tracking-tight">
            {stats.totalInvoices}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-muted-foreground text-sm font-medium">
            Overdue Invoices
          </CardTitle>
          <AlertCircle className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-semibold tracking-tight">
            {stats.overdueInvoices}
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
