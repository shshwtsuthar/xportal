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
  getDepositsColumns,
} from './depositsTableColumns';
import {
  getDepositsTableKey,
  useGetTablePreferences,
  useUpsertTablePreferences,
} from '@/src/hooks/useTablePreferences';

export const DepositsColumnsMenu = () => {
  const tableKey = getDepositsTableKey();
  const { data: prefs } = useGetTablePreferences(tableKey);
  const upsertPrefs = useUpsertTablePreferences();

  const allColumns = getDepositsColumns();
  const visible = (
    prefs?.visible_columns?.length
      ? prefs.visible_columns
      : DEFAULT_VISIBLE_COLUMNS
  ) as string[];

  const toggleColumn = (id: string) => {
    const next = visible.includes(id)
      ? visible.filter((x) => x !== id)
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
      <DropdownMenuContent align="end" className="w-56">
        {allColumns.map((col) => (
          <DropdownMenuCheckboxItem
            key={col.id}
            checked={visible.includes(col.id)}
            onCheckedChange={() => toggleColumn(col.id)}
          >
            {col.label}
          </DropdownMenuCheckboxItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem
          checked={visible.length === allColumns.length}
          onCheckedChange={(checked) => {
            upsertPrefs.mutate({
              tableKey,
              visible_columns: checked ? allColumns.map((c) => c.id) : [],
              column_widths:
                (prefs?.column_widths as Record<string, number>) ?? {},
            });
          }}
        >
          Select All
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
