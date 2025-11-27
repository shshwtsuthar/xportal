'use client';

import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  DEFAULT_VISIBLE_COLUMNS,
  getPaymentConfirmationsColumns,
} from './paymentConfirmationsTableColumns';
import {
  getPaymentConfirmationsTableKey,
  useGetTablePreferences,
  useUpsertTablePreferences,
} from '@/src/hooks/useTablePreferences';

export const PaymentConfirmationsColumnsMenu = () => {
  const tableKey = getPaymentConfirmationsTableKey();
  const { data: prefs } = useGetTablePreferences(tableKey);
  const upsertPrefs = useUpsertTablePreferences();

  const allColumns = getPaymentConfirmationsColumns();
  const visible = prefs?.visible_columns?.length
    ? (prefs.visible_columns as string[])
    : DEFAULT_VISIBLE_COLUMNS;

  const toggleColumn = (id: string) => {
    const next = visible.includes(id)
      ? visible.filter((col) => col !== id)
      : [...visible, id];
    upsertPrefs.mutate({
      tableKey,
      visible_columns: next,
      column_widths: (prefs?.column_widths as Record<string, number>) ?? {},
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" aria-label="Toggle columns">
          <Plus className="mr-2 h-4 w-4" />
          Columns
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <div className="text-muted-foreground px-2 py-1.5 text-xs font-medium">
          Toggle columns
        </div>
        <DropdownMenuSeparator />
        {allColumns.map((column) => (
          <DropdownMenuCheckboxItem
            key={column.id}
            checked={visible.includes(column.id)}
            onCheckedChange={() => toggleColumn(column.id)}
          >
            {column.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
