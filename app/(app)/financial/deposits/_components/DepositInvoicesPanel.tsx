'use client';

import { useState } from 'react';
import { useGetApplicationDepositInvoices } from '@/src/hooks/useGetApplicationDepositInvoices';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { RecordDepositPaymentDialog } from './RecordDepositPaymentDialog';
import { format } from 'date-fns';

type Props = {
  applicationId: string;
};

export function DepositInvoicesPanel({ applicationId }: Props) {
  const { data, isLoading, isError } =
    useGetApplicationDepositInvoices(applicationId);
  const [selectedDepositInvoiceId, setSelectedDepositInvoiceId] = useState<
    string | undefined
  >();

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const getStatusBadge = (invoice: { status: string }) => {
    if (invoice.status === 'PAID') {
      return <Badge variant="default">Paid</Badge>;
    }
    if (invoice.status === 'PARTIALLY_PAID') {
      return <Badge variant="secondary">Partially Paid</Badge>;
    }
    return <Badge variant="outline">Unpaid</Badge>;
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <p className="text-destructive text-sm">
        Failed to load deposit invoices.
      </p>
    );
  }

  if (!data || data.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No deposit invoices found.
      </p>
    );
  }

  return (
    <>
      <div className="mb-2">
        <h4 className="text-sm font-semibold">Deposit Invoices</h4>
        <p className="text-muted-foreground text-xs">
          These instalments must be paid before the applicant can be accepted
        </p>
      </div>

      <div className="bg-background rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="divide-x">
              <TableHead>Name</TableHead>
              <TableHead>Invoice Number</TableHead>
              <TableHead className="text-right">Amount Due</TableHead>
              <TableHead className="text-right">Amount Paid</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y">
            {data.map((invoice) => {
              const balance =
                invoice.amount_due_cents - invoice.amount_paid_cents;
              const isPaid = invoice.status === 'PAID';

              return (
                <TableRow key={invoice.id} className="divide-x">
                  <TableCell className="font-medium">{invoice.name}</TableCell>
                  <TableCell className="font-mono text-sm">
                    {invoice.invoice_number}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(invoice.amount_due_cents)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(invoice.amount_paid_cents)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(balance)}
                  </TableCell>
                  <TableCell>
                    {invoice.due_date
                      ? format(new Date(invoice.due_date), 'dd MMM yyyy')
                      : '—'}
                  </TableCell>
                  <TableCell>{getStatusBadge(invoice)}</TableCell>
                  <TableCell className="text-right">
                    {!isPaid && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedDepositInvoiceId(invoice.id)}
                      >
                        Record Payment
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <RecordDepositPaymentDialog
        depositInvoiceId={selectedDepositInvoiceId}
        onClose={() => setSelectedDepositInvoiceId(undefined)}
      />
    </>
  );
}
