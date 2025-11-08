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
import type { Tables } from '@/database.types';
import type { StudentFilters } from '@/src/hooks/useStudentsFilters';
import { exportToCSV, exportToXLSX } from '@/lib/utils/exportStudents';

type RowType = Tables<'students'>;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  getRows: () => RowType[];
  filters?: StudentFilters;
};

export function ExportDialog({ open, onOpenChange, getRows, filters }: Props) {
  const [format, setFormat] = React.useState<'csv' | 'xlsx'>('csv');
  const rows = React.useMemo(() => getRows(), [getRows, open]);
  const count = rows.length;
  const hasRows = count > 0;

  const handleExport = async () => {
    if (!hasRows) return;
    if (format === 'csv') {
      await exportToCSV(rows, filters);
      onOpenChange(false);
      return;
    }
    await exportToXLSX(rows, filters);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export students</DialogTitle>
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
