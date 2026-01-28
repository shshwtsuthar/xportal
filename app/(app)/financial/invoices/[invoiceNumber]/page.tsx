'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import {
  DollarSign,
  Receipt,
  Clock,
  CheckCircle2,
  TrendingUp,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';
import { InvoiceHeader } from '@/components/invoice/invoice-header';
import { InvoiceDetails } from '@/components/invoice/invoice-details';
import { StatCard } from '@/components/ui/stat-card';
import {
  InvoicePaymentsDataTable,
  type InvoicePaymentsDataTableRef,
} from '../_components/InvoicePaymentsDataTable';
import { ExportDialogInvoicePayments } from '../_components/ExportDialogInvoicePayments';
import { InvoicePaymentsColumnsMenu } from '../_components/InvoicePaymentsColumnsMenu';
import { RecordPaymentDialog } from '../_components/RecordPaymentDialog';
import { useResolveInvoiceByNumber } from '@/src/hooks/useResolveInvoiceByNumber';
import { useGetInvoicePayments } from '@/src/hooks/useGetInvoicePayments';
import { useGenerateInvoicePdf } from '@/src/hooks/useGenerateInvoicePdf';
import type { InvoiceType } from '@/src/hooks/useGetInvoicePayments';
import { PageContainer } from '@/components/page-container';

const formatCurrency = (cents: number | null | undefined) => {
  const dollars = (cents ?? 0) / 100;
  return dollars.toLocaleString('en-AU', {
    style: 'currency',
    currency: 'AUD',
  });
};

const formatDateLong = (value: string | null | undefined) => {
  if (!value) return '—';
  try {
    return format(new Date(value), 'dd MMM yyyy');
  } catch {
    return value;
  }
};

type HeaderStatus = 'paid' | 'partial' | 'unpaid' | 'overdue';

const deriveStatus = (
  invoice: {
    amount_due_cents: number | null;
    amount_paid_cents: number | null;
    due_date: string | null;
  } | null
): HeaderStatus => {
  if (!invoice) return 'unpaid';
  const due = invoice.amount_due_cents ?? 0;
  const paid = invoice.amount_paid_cents ?? 0;
  if (due > 0 && paid >= due) return 'paid';
  const dueDate = invoice.due_date ? new Date(invoice.due_date) : null;
  if (dueDate && dueDate < new Date() && paid < due) return 'overdue';
  if (paid > 0) return 'partial';
  return 'unpaid';
};

export default function InvoiceNumberPage() {
  const params = useParams<{ invoiceNumber: string }>();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [recordPaymentOpen, setRecordPaymentOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const paymentsTableRef = useRef<InvoicePaymentsDataTableRef>(null);

  const invoiceNumber = params.invoiceNumber;
  const preferredType = searchParams.get('type') as InvoiceType | null;

  const {
    data: invoice,
    isLoading,
    isError,
    error: queryError,
  } = useResolveInvoiceByNumber(invoiceNumber, preferredType ?? undefined);

  const { data: payments = [] } = useGetInvoicePayments({
    invoiceId: invoice?.id,
    invoiceType: invoice?.invoice_type,
  });

  const generatePdf = useGenerateInvoicePdf();

  useEffect(() => {
    if (isError && queryError) {
      setError(
        queryError instanceof Error ? queryError.message : String(queryError)
      );
    }
  }, [isError, queryError]);

  const getRowsForExport = useCallback(() => {
    return paymentsTableRef.current?.getRows() ?? [];
  }, []);

  const amountDueCents = invoice?.amount_due_cents ?? 0;
  const amountPaidCents = invoice?.amount_paid_cents ?? 0;
  const remainingCents = amountDueCents - amountPaidCents;
  const percentagePaid =
    amountDueCents > 0
      ? Math.round((amountPaidCents / amountDueCents) * 100)
      : 0;

  const dueDate = invoice?.due_date ? new Date(invoice.due_date) : null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysUntilDue =
    dueDate != null
      ? Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      : null;

  const completedCount = payments.filter(
    (p) => (p.xero_sync_status ?? '') === 'synced'
  ).length;

  const backHref = preferredType
    ? `/financial/invoices?type=${preferredType}`
    : '/financial/invoices';

  const handleDownload = useCallback(() => {
    if (!invoice?.id) return;
    generatePdf.mutate(
      { invoiceId: invoice.id },
      {
        onSuccess: () => toast.success('Invoice PDF generated'),
        onError: (e) =>
          toast.error(
            e instanceof Error ? e.message : 'Failed to generate invoice PDF'
          ),
      }
    );
  }, [invoice?.id, generatePdf]);

  return (
    <PageContainer variant="fullWidth">
      {/* Header: always show so user can navigate back */}
      <div className="mb-6">
        <InvoiceHeader
          invoiceNumber={invoice?.invoice_number ?? invoiceNumber}
          status={invoice ? deriveStatus(invoice) : 'unpaid'}
          clientName={invoice?.client_name ?? undefined}
          backHref={backHref}
          onDownload={invoice ? handleDownload : undefined}
          showSendReminder={false}
          showMoreMenu={false}
        />
      </div>

      {/* Loading / not found */}
      {isLoading && (
        <p className="text-muted-foreground mb-6 text-sm">Loading invoice…</p>
      )}
      {!isLoading && !invoice && !error && (
        <p className="text-muted-foreground mb-6 text-sm">
          Invoice details will appear here.
        </p>
      )}
      {error && (
        <p className="text-destructive mb-6 text-sm" role="alert">
          {error}
        </p>
      )}

      {invoice && (
        <>
          {/* Stats Grid */}
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard
              title="Total Amount"
              value={formatCurrency(amountDueCents)}
              subtitle="Invoice total"
              icon={Receipt}
            />
            <StatCard
              title="Amount Paid"
              value={formatCurrency(amountPaidCents)}
              subtitle={`${percentagePaid}% of total`}
              icon={CheckCircle2}
              trend={
                percentagePaid > 0
                  ? { value: `${percentagePaid}%`, positive: true }
                  : undefined
              }
            />
            <StatCard
              title="Remaining"
              value={formatCurrency(remainingCents)}
              subtitle="Amount due"
              icon={DollarSign}
            />
            <StatCard
              title="Payments"
              value={String(payments.length)}
              subtitle={`${completedCount} synced`}
              icon={TrendingUp}
            />
            <StatCard
              title="Days Until Due"
              value={
                daysUntilDue !== null
                  ? daysUntilDue < 0
                    ? 'Overdue'
                    : String(daysUntilDue)
                  : '—'
              }
              subtitle={dueDate ? formatDateLong(invoice.due_date) : undefined}
              icon={Clock}
            />
          </div>

          {/* Invoice Details */}
          {invoice.issue_date != null && invoice.due_date != null && (
            <div className="mb-6">
              <InvoiceDetails
                issueDate={invoice.issue_date}
                dueDate={invoice.due_date}
              />
            </div>
          )}

          {/* Payment History */}
          <div className="mb-6">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-semibold">Payment History</h2>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setRecordPaymentOpen(true)}
                  aria-label="Record a new payment for this invoice"
                >
                  Record Payment
                </Button>
                <InvoicePaymentsColumnsMenu />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setExportOpen(true)}
                  aria-label="Export payments"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </div>
            </div>
            <Card>
              <CardContent className="pt-6">
                <InvoicePaymentsDataTable
                  ref={paymentsTableRef}
                  invoiceId={invoice.id}
                  invoiceType={invoice.invoice_type}
                />
              </CardContent>
            </Card>
          </div>
        </>
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
    </PageContainer>
  );
}
