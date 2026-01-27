'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CopyToClipboardBadge } from '@/components/ui/copy-to-clipboard-badge';
import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';
import { Download } from 'lucide-react';
import {
  InvoicePaymentsDataTable,
  type InvoicePaymentsDataTableRef,
} from '../_components/InvoicePaymentsDataTable';
import { ExportDialogInvoicePayments } from '../_components/ExportDialogInvoicePayments';
import { InvoicePaymentsColumnsMenu } from '../_components/InvoicePaymentsColumnsMenu';
import { RecordPaymentDialog } from '../_components/RecordPaymentDialog';
import { useResolveInvoiceByNumber } from '@/src/hooks/useResolveInvoiceByNumber';
import type { InvoiceType } from '@/src/hooks/useGetInvoicePayments';

const formatCurrency = (cents: number | null | undefined) => {
  const dollars = (cents ?? 0) / 100;
  return dollars.toLocaleString('en-AU', {
    style: 'currency',
    currency: 'AUD',
  });
};

const formatDate = (value: string | null | undefined) => {
  if (!value) return '—';
  try {
    return format(new Date(value), 'dd MMM yyyy');
  } catch {
    return value;
  }
};

export default function InvoiceNumberPage() {
  const params = useParams<{ invoiceNumber: string }>();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [recordPaymentOpen, setRecordPaymentOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const paymentsTableRef = useRef<InvoicePaymentsDataTableRef>(null);

  const invoiceNumber = params.invoiceNumber;

  const getRowsForExport = useCallback(() => {
    return paymentsTableRef.current?.getRows() ?? [];
  }, []);

  const preferredType = searchParams.get('type') as InvoiceType | null;
  const {
    data: invoice,
    isLoading,
    isError,
    error: queryError,
  } = useResolveInvoiceByNumber(invoiceNumber, preferredType ?? undefined);

  useEffect(() => {
    if (isError && queryError) {
      setError(
        queryError instanceof Error ? queryError.message : String(queryError)
      );
    }
  }, [isError, queryError]);

  const amountDueCents = invoice?.amount_due_cents ?? 0;
  const amountPaidCents = invoice?.amount_paid_cents ?? 0;
  const balanceCents = amountDueCents - amountPaidCents;
  const paymentProgress =
    amountDueCents > 0
      ? Math.min(100, Math.max(0, (amountPaidCents / amountDueCents) * 100))
      : 0;

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Invoice{' '}
          <CopyToClipboardBadge
            value={invoiceNumber}
            label="Invoice number"
            size="lg"
            className="align-middle"
          />
        </h1>
      </div>

      <Card className="mb-6">
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle className="text-base font-semibold tracking-tight">
            Payment overview
          </CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!invoice || isLoading}
            onClick={() => setRecordPaymentOpen(true)}
            aria-label="Record a new payment for this invoice"
          >
            Record Payment
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          )}
          {invoice && (
            <div className="space-y-2">
              <div className="text-muted-foreground flex items-center justify-between text-xs">
                <span>Payment progress</span>
                <span className="tabular-nums">
                  {paymentProgress.toFixed(0)}%
                </span>
              </div>
              <Progress value={paymentProgress} className="h-2" />
            </div>
          )}
          {isLoading && (
            <p className="text-muted-foreground text-sm">Loading invoice…</p>
          )}
          {!isLoading && !invoice && !error && (
            <p className="text-muted-foreground text-sm">
              Invoice details will appear here.
            </p>
          )}
        </CardContent>
      </Card>

      {invoice && (
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-base font-semibold">
                Payments
              </CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <InvoicePaymentsColumnsMenu />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setExportOpen(true)}
                  aria-label="Export payments"
                >
                  <Download className="mr-2 h-4 w-4" /> Export
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <InvoicePaymentsDataTable
              ref={paymentsTableRef}
              invoiceId={invoice.id}
              invoiceType={invoice.invoice_type}
            />
          </CardContent>
        </Card>
      )}

      <ExportDialogInvoicePayments
        open={exportOpen}
        onOpenChange={setExportOpen}
        getRows={getRowsForExport}
        invoiceNumber={invoiceNumber}
      />

      {invoice && recordPaymentOpen && (
        <RecordPaymentDialog
          invoiceId={invoice.id}
          invoiceType={invoice.invoice_type}
          onClose={() => setRecordPaymentOpen(false)}
        />
      )}
    </div>
  );
}
