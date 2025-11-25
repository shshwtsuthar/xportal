'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useGetUnconfirmedPayments } from '@/src/hooks/useGetUnconfirmedPayments';
import { useConfirmPayment } from '@/src/hooks/useConfirmPayment';

function formatDateSafe(value: string | null | undefined) {
  if (!value) return '-';
  try {
    return format(new Date(value), 'dd/MM/yyyy');
  } catch {
    return value;
  }
}

function centsToAud(cents: number | null | undefined) {
  const dollars = (cents ?? 0) / 100;
  return dollars.toLocaleString('en-AU', {
    style: 'currency',
    currency: 'AUD',
  });
}

export default function PaymentConfirmationsPage() {
  const { data, isLoading, isError } = useGetUnconfirmedPayments();
  const confirmPayment = useConfirmPayment();

  const rows = useMemo(() => data ?? [], [data]);

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Payment Confirmations
        </h1>
        <p className="text-muted-foreground text-sm">
          Review recorded payments and confirm which ones should be synced to
          Xero.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-sm">
              Payments listed here have been recorded in XPortal but are not yet
              confirmed in Xero (pending, failed, or not attempted).
            </p>
            <Badge variant="outline">
              {rows.length} payment{rows.length === 1 ? '' : 's'} to review
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <p className="text-muted-foreground text-sm">Loading payments…</p>
          )}
          {isError && (
            <p className="text-destructive text-sm">Failed to load payments.</p>
          )}
          {!isLoading && !isError && (
            <div className="w-full overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Payment Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Xero Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => {
                    const invoice = row.invoices;
                    const enrollment = invoice?.enrollments;
                    const student = enrollment?.students;
                    const studentName = student
                      ? `${student.first_name ?? ''} ${
                          student.last_name ?? ''
                        }`.trim()
                      : 'Unknown student';

                    const syncStatus = row.xero_sync_status ?? 'pending';

                    return (
                      <TableRow key={row.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{studentName}</span>
                            {student?.student_id_display && (
                              <span className="text-muted-foreground text-xs">
                                {student.student_id_display}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-mono text-sm">
                              {invoice?.invoice_number ?? '—'}
                            </span>
                            <span className="text-muted-foreground text-xs">
                              Due {formatDateSafe(invoice?.due_date ?? null)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {formatDateSafe(row.payment_date as string)}
                        </TableCell>
                        <TableCell>{centsToAud(row.amount_cents)}</TableCell>
                        <TableCell>{row.method ?? '—'}</TableCell>
                        <TableCell className="max-w-xs truncate">
                          {row.reconciliation_notes ?? '—'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              syncStatus === 'failed'
                                ? 'destructive'
                                : 'outline'
                            }
                          >
                            {syncStatus === 'pending' || syncStatus === null
                              ? 'Pending'
                              : syncStatus === 'failed'
                                ? 'Failed'
                                : syncStatus === 'synced'
                                  ? 'Synced'
                                  : syncStatus}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            onClick={async () => {
                              try {
                                await confirmPayment.mutateAsync({
                                  paymentId: row.id as string,
                                });
                                toast.success(
                                  'Payment confirmed and synced to Xero'
                                );
                              } catch (error) {
                                toast.error(
                                  error instanceof Error
                                    ? error.message
                                    : 'Failed to confirm payment'
                                );
                              }
                            }}
                            disabled={confirmPayment.isPending}
                          >
                            Confirm Payment
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {rows.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="text-muted-foreground py-8 text-center text-sm"
                      >
                        No unconfirmed payments. Recorded payments have either
                        not been created yet or are already confirmed in Xero.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
