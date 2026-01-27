'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download } from 'lucide-react';
import type { ExportFormat } from './types';

type DataTableToolbarProps<T> = {
  selectedRows: T[];
  enableExport?: boolean;
  exportFormats?: ExportFormat[];
  onExport?: (format: ExportFormat) => void;
  renderCustomActions?: () => React.ReactNode;
};

export const DataTableToolbar = <T,>({
  selectedRows,
  enableExport = false,
  exportFormats = ['csv', 'xlsx'],
  onExport,
  renderCustomActions,
}: DataTableToolbarProps<T>) => {
  const hasSelection = selectedRows.length > 0;

  if (!enableExport && !renderCustomActions) {
    return null;
  }

  return (
    <div className="flex items-center justify-between px-3 py-2">
      <div className="flex items-center gap-2">
        {hasSelection && (
          <span className="text-muted-foreground text-sm">
            {selectedRows.length} row{selectedRows.length !== 1 ? 's' : ''}{' '}
            selected
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {renderCustomActions?.()}
        {enableExport && onExport && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {exportFormats.includes('csv') && (
                <DropdownMenuItem onClick={() => onExport('csv')}>
                  Export as CSV
                </DropdownMenuItem>
              )}
              {exportFormats.includes('xlsx') && (
                <DropdownMenuItem onClick={() => onExport('xlsx')}>
                  Export as Excel
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
};
