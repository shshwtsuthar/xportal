import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FinanceLogFilters } from '@/src/hooks/useGetFinanceLogs';

type Props = {
  filters: FinanceLogFilters;
  onChange: (next: FinanceLogFilters) => void;
};

const EVENT_TYPES = [
  { value: 'invoice_pdf', label: 'Invoice PDF' },
  { value: 'invoice_email', label: 'Invoice Email' },
  { value: 'payment_received', label: 'Payment' },
  { value: 'commission_invoice', label: 'Commission Invoice' },
  { value: 'commission_payment', label: 'Commission Payment' },
] as const;

const STATUSES = [
  { value: 'succeeded', label: 'Succeeded' },
  { value: 'sent', label: 'Sent' },
  { value: 'pending', label: 'Pending' },
  { value: 'failed', label: 'Failed' },
  { value: 'completed', label: 'Completed' },
] as const;

export function FinanceLogsFilters({ filters, onChange }: Props) {
  const selectedType = useMemo(
    () => filters.types?.[0] ?? 'all',
    [filters.types]
  );
  const selectedStatus = useMemo(
    () => filters.statuses?.[0] ?? 'all',
    [filters.statuses]
  );

  return (
    <div className="bg-card grid gap-3 rounded-md border p-3 shadow-sm md:grid-cols-4">
      <div className="space-y-1">
        <label className="text-muted-foreground text-xs font-medium">
          Search
        </label>
        <Input
          placeholder="Invoice, student, program, message"
          value={filters.search ?? ''}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
        />
      </div>
      <div className="space-y-1">
        <label className="text-muted-foreground text-xs font-medium">
          Type
        </label>
        <Select
          value={selectedType}
          onValueChange={(value) =>
            onChange({
              ...filters,
              types: value === 'all' ? [] : [value],
            })
          }
        >
          <SelectTrigger aria-label="Event type">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {EVENT_TYPES.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <label className="text-muted-foreground text-xs font-medium">
          Status
        </label>
        <Select
          value={selectedStatus}
          onValueChange={(value) =>
            onChange({
              ...filters,
              statuses: value === 'all' ? [] : [value],
            })
          }
        >
          <SelectTrigger aria-label="Status">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-muted-foreground text-xs font-medium">
            From
          </label>
          <Input
            type="date"
            value={filters.dateFrom ?? ''}
            onChange={(e) => onChange({ ...filters, dateFrom: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <label className="text-muted-foreground text-xs font-medium">
            To
          </label>
          <Input
            type="date"
            value={filters.dateTo ?? ''}
            onChange={(e) => onChange({ ...filters, dateTo: e.target.value })}
          />
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 md:col-span-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            onChange({
              types: [],
              statuses: [],
              dateFrom: undefined,
              dateTo: undefined,
              search: '',
            })
          }
        >
          Reset
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onChange({ ...filters })}
        >
          Apply
        </Button>
      </div>
    </div>
  );
}
