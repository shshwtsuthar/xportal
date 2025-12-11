'use client';

import { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FinanceLogsFilters } from './_components/FinanceLogsFilters';
import { FinanceLogsTable } from './_components/FinanceLogsTable';
import {
  FinanceLogFilters,
  useGetFinanceLogs,
} from '@/src/hooks/useGetFinanceLogs';
import {
  formatAmount,
  formatDateTime,
  renderType,
} from './_components/financeLogsColumns';
import { toast } from 'sonner';

const DEFAULT_FILTERS: FinanceLogFilters = {
  types: [],
  statuses: [],
  dateFrom: undefined,
  dateTo: undefined,
  search: '',
};

export default function FinanceLogsPage() {
  const [filters, setFilters] = useState<FinanceLogFilters>(DEFAULT_FILTERS);
  const { data, isLoading, isFetching, refetch } = useGetFinanceLogs(filters);

  const rows = useMemo(() => data ?? [], [data]);

  const handleExport = () => {
    if (!rows.length) {
      toast.info('No rows to export');
      return;
    }
    const header = [
      'Occurred',
      'Type',
      'Status',
      'Invoice',
      'Student',
      'Email',
      'Program',
      'Amount',
      'Attempts',
      'Message',
    ];
    const lines = rows.map((r) =>
      [
        formatDateTime(r.occurred_at),
        renderType(r.event_type),
        r.status,
        r.invoice_number ?? '',
        r.student_name ?? '',
        r.student_email ?? '',
        r.program_name ?? '',
        formatAmount(r.amount_due_cents),
        r.attempts ?? '',
        (r.message ?? '').replace(/\n/g, ' '),
      ].join(',')
    );
    const csv = [header.join(','), ...lines].join('\\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'finance_logs.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl leading-tight font-semibold">Finance Logs</h1>
          <p className="text-muted-foreground text-sm">
            Unified timeline of invoice emails/PDFs, payments, and commission
            events.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      <FinanceLogsFilters filters={filters} onChange={setFilters} />

      <FinanceLogsTable
        entries={rows}
        isLoading={isLoading}
        isFetching={isFetching}
        onRefresh={() => refetch()}
      />
    </div>
  );
}
