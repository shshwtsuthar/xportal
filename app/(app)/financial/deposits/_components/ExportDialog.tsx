'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Download } from 'lucide-react';
import {
  getDepositsTableKey,
  useGetTablePreferences,
} from '@/src/hooks/useTablePreferences';
import { DEFAULT_VISIBLE_COLUMNS } from './depositsTableColumns';
import {
  exportDepositsToCSV,
  exportDepositsToXLSX,
} from '@/lib/utils/exportDeposits';
import type { RowType } from './depositsTableColumns';
import type { DepositFilters } from '@/src/hooks/useDepositsFilters';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  getRows: () => RowType[];
  filters?: DepositFilters;
};

export function ExportDialog({ open, onOpenChange, getRows, filters }: Props) {
  const [format, setFormat] = React.useState<'csv' | 'xlsx'>('csv');
  const tableKey = getDepositsTableKey();
  const { data: prefs } = useGetTablePreferences(tableKey);
  const rows = React.useMemo(() => getRows(), [getRows, open]);
  const count = rows.length;
  const hasRows = count > 0;
  const visibleColumns = React.useMemo(() => {
    if (prefs?.visible_columns?.length) {
      return prefs.visible_columns;
    }
    return DEFAULT_VISIBLE_COLUMNS;
  }, [prefs]);

  const handleExport = async () => {
    if (!hasRows) return;
    if (format === 'csv') {
      await exportDepositsToCSV(rows, filters, visibleColumns);
      onOpenChange(false);
      return;
    }
    await exportDepositsToXLSX(rows, filters, visibleColumns);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export deposits</DialogTitle>
          <DialogDescription>
            {hasRows
              ? `${count} rows will be exported in current order.`
              : 'No rows to export.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="format">Format</Label>
            <RadioGroup
              id="format"
              value={format}
              onValueChange={(v) => setFormat(v as 'csv' | 'xlsx')}
              className="grid grid-cols-2 gap-2"
            >
              <div className="flex items-center space-x-2 rounded-md border p-3">
                <RadioGroupItem value="csv" id="fmt-csv" />
                <Label htmlFor="fmt-csv" className="cursor-pointer">
                  CSV
                </Label>
              </div>
              <div className="flex items-center space-x-2 rounded-md border p-3">
                <RadioGroupItem value="xlsx" id="fmt-xlsx" />
                <Label htmlFor="fmt-xlsx" className="cursor-pointer">
                  XLSX
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={!hasRows}
            aria-label="Export"
          >
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
