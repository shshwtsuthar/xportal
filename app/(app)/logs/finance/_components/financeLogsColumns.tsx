import { Badge } from '@/components/ui/badge';
import { FinanceLogEntry } from '@/src/hooks/useGetFinanceLogs';

const currency = new Intl.NumberFormat('en-AU', {
  style: 'currency',
  currency: 'AUD',
});

const statusVariant = (status: string) => {
  if (status === 'succeeded' || status === 'sent' || status === 'completed') {
    return 'default';
  }
  if (status === 'failed') return 'destructive';
  return 'outline';
};

const typeLabel: Record<string, string> = {
  invoice_pdf: 'Invoice PDF',
  invoice_email: 'Invoice Email',
  payment_received: 'Payment',
  commission_invoice: 'Commission Invoice',
  commission_payment: 'Commission Payment',
};

export const renderType = (type: FinanceLogEntry['event_type']) =>
  typeLabel[type] ?? type;

export const renderStatusBadge = (status: string) => (
  <Badge variant={statusVariant(status)}>{status.toUpperCase()}</Badge>
);

export const formatAmount = (cents: number | null) => {
  if (cents === null || cents === undefined) return '—';
  return currency.format(cents / 100);
};

export const formatDateTime = (value: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};
