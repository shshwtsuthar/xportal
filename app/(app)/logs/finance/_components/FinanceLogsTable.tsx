import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollText, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { FinanceLogEntry } from '@/src/hooks/useGetFinanceLogs';
import {
  formatAmount,
  formatDateTime,
  renderStatusBadge,
  renderType,
} from './financeLogsColumns';

type Props = {
  entries: FinanceLogEntry[] | undefined;
  isLoading: boolean;
  isFetching: boolean;
  onRefresh: () => void;
};

export function FinanceLogsTable({
  entries,
  isLoading,
  isFetching,
  onRefresh,
}: Props) {
  const [selected, setSelected] = useState<FinanceLogEntry | null>(null);

  const rows = useMemo(() => entries ?? [], [entries]);

  const handleAction = (entry: FinanceLogEntry) => {
    if (entry.event_type === 'invoice_email' && entry.invoice_id) {
      toast.info(
        'Resend is not yet wired to a backend trigger. Run issue-due-invoices to resend.',
        { duration: 4000 }
      );
      return;
    }
    toast.info('Action not available for this entry.');
  };

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <ScrollText className="h-4 w-4" />
          <span>{rows.length} log entries</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isFetching}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>
      <div className="mt-3 overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Occurred</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Invoice</TableHead>
              <TableHead>Student</TableHead>
              <TableHead>Program</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Message</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 8 }).map((_, idx) => (
                  <TableRow key={idx}>
                    {Array.from({ length: 8 }).map((__, cIdx) => (
                      <TableCell key={cIdx}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : rows.map((row) => (
                  <TableRow
                    key={row.log_id}
                    className="hover:bg-muted/50 cursor-pointer"
                    onClick={() => setSelected(row)}
                  >
                    <TableCell>{formatDateTime(row.occurred_at)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {renderType(row.event_type)}
                      </Badge>
                    </TableCell>
                    <TableCell>{renderStatusBadge(row.status)}</TableCell>
                    <TableCell>
                      {row.invoice_id && row.invoice_number ? (
                        <Link
                          href={`/financial/invoices?invoice=${row.invoice_id}`}
                          className="text-primary hover:underline"
                        >
                          {row.invoice_number}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {row.student_name || '—'}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          {row.student_email || '—'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{row.program_name || '—'}</TableCell>
                    <TableCell className="text-right">
                      {formatAmount(row.amount_due_cents)}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {row.message || '—'}
                    </TableCell>
                  </TableRow>
                ))}
            {!isLoading && rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-muted-foreground text-center"
                >
                  No finance log entries found.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={!!selected}
        onOpenChange={(open) => !open && setSelected(null)}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {selected ? renderType(selected.event_type) : 'Details'}
            </DialogTitle>
          </DialogHeader>
          {selected ? (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <Detail
                  label="Status"
                  value={renderStatusBadge(selected.status)}
                />
                <Detail
                  label="Occurred"
                  value={formatDateTime(selected.occurred_at)}
                />
                <Detail
                  label="Invoice"
                  value={selected.invoice_number ?? '—'}
                />
                <Detail
                  label="Amount"
                  value={formatAmount(selected.amount_due_cents)}
                />
                <Detail label="Student" value={selected.student_name ?? '—'} />
                <Detail label="Program" value={selected.program_name ?? '—'} />
                <Detail label="Attempts" value={selected.attempts ?? '—'} />
              </div>
              <div className="space-y-1">
                <div className="text-muted-foreground text-xs font-medium">
                  Message
                </div>
                <div className="bg-muted/30 rounded-md border p-2 text-sm">
                  {selected.message || '—'}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAction(selected)}
                >
                  Resend / Retry
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

const Detail = ({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) => (
  <div className="space-y-1">
    <div className="text-muted-foreground text-xs font-medium">{label}</div>
    <div className="text-sm leading-tight font-medium">{value}</div>
  </div>
);
