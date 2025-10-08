'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Tables } from '@/database.types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RecordPaymentDialog } from './RecordPaymentDialog';

export function StudentInvoicesTable() {
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<
    string | undefined
  >();

  const { data: invoices, isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: async (): Promise<Tables<'invoices'>[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .order('due_date', { ascending: true });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const rows = useMemo(() => invoices ?? [], [invoices]);

  const getStatusBadge = (invoice: Tables<'invoices'>) => {
    const status = invoice.status as string;
    const dueDate = new Date(invoice.due_date as string);
    const today = new Date();

    if (status === 'PAID') {
      return <Badge variant="default">Paid</Badge>;
    }
    if (status === 'VOID') {
      return <Badge variant="secondary">Void</Badge>;
    }
    if (status === 'SENT' && dueDate < today) {
      return <Badge variant="destructive">Overdue</Badge>;
    }
    if (status === 'SENT') {
      return <Badge variant="default">Sent</Badge>;
    }
    if (status === 'SCHEDULED') {
      return <Badge variant="secondary">Scheduled</Badge>;
    }
    return <Badge variant="secondary">{status}</Badge>;
  };

  if (isLoading)
    return <p className="text-muted-foreground text-sm">Loading invoices…</p>;

  return (
    <>
      <div className="w-full overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="divide-x">
              <TableHead>Invoice #</TableHead>
              <TableHead>Issue Date</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead className="text-right">Amount Due</TableHead>
              <TableHead className="text-right">Amount Paid</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y">
            {rows.map((inv) => (
              <TableRow key={inv.id} className="divide-x">
                <TableCell className="font-mono text-sm">
                  {String(inv.invoice_number).slice(0, 8)}
                </TableCell>
                <TableCell>{inv.issue_date as string}</TableCell>
                <TableCell>{inv.due_date as string}</TableCell>
                <TableCell className="text-right">
                  ${((inv.amount_due_cents ?? 0) / 100).toFixed(2)}
                </TableCell>
                <TableCell className="text-right">
                  ${((inv.amount_paid_cents ?? 0) / 100).toFixed(2)}
                </TableCell>
                <TableCell>{getStatusBadge(inv)}</TableCell>
                <TableCell className="text-right">
                  {inv.status !== 'PAID' && inv.status !== 'VOID' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedInvoiceId(inv.id as string)}
                    >
                      Record Payment
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow className="divide-x">
                <TableCell colSpan={7}>
                  <p className="text-muted-foreground text-sm">
                    No invoices found.
                  </p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <RecordPaymentDialog
        invoiceId={selectedInvoiceId}
        onClose={() => setSelectedInvoiceId(undefined)}
      />
    </>
  );
}
