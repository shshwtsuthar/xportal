'use client';

import { useState, useEffect } from 'react';
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
  getApplicationsColumns,
} from './applicationsTableColumns';
import {
  getApplicationsTableKey,
  useGetTablePreferences,
  useUpsertTablePreferences,
} from '@/src/hooks/useTablePreferences';

export const ApplicationsColumnsMenu = () => {
  const [mounted, setMounted] = useState(false);
  const tableKey = getApplicationsTableKey();
  const { data: prefs } = useGetTablePreferences(tableKey);
  const upsertPrefs = useUpsertTablePreferences();

  // Ensure component only renders on client to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const allColumns = getApplicationsColumns();
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

  // Prevent hydration mismatch by only rendering DropdownMenu after mount
  if (!mounted) {
    return (
      <Button variant="outline" size="sm" aria-label="Toggle columns" disabled>
        <Plus className="mr-2 h-4 w-4" />
        Columns
      </Button>
    );
  }

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
        {allColumns.map((c) => (
          <DropdownMenuCheckboxItem
            key={c.id}
            checked={visible.includes(c.id)}
            onCheckedChange={() => toggleColumn(c.id)}
          >
            {c.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
