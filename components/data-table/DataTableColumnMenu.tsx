'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Columns } from 'lucide-react';
import type { DataTableColumnDef } from './types';

type DataTableColumnMenuProps<T> = {
  columns: DataTableColumnDef<T>[];
  visibleColumns: string[];
  onToggleColumn: (columnId: string) => void;
  onReset: () => void;
};

export const DataTableColumnMenu = <T,>({
  columns,
  visibleColumns,
  onToggleColumn,
  onReset,
}: DataTableColumnMenuProps<T>) => {
  // Group columns by group if available
  const groupedColumns = columns.reduce(
    (acc, col) => {
      const group = col.group || 'Other';
      if (!acc[group]) {
        acc[group] = [];
      }
      acc[group].push(col);
      return acc;
    },
    {} as Record<string, DataTableColumnDef<T>[]>
  );

  const groups = Object.keys(groupedColumns).sort();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8">
          <Columns className="mr-2 h-4 w-4" />
          Columns
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[200px]">
        <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {groups.map((group) => (
          <div key={group}>
            {groups.length > 1 && (
              <>
                <DropdownMenuLabel className="text-muted-foreground text-xs">
                  {group}
                </DropdownMenuLabel>
              </>
            )}
            {groupedColumns[group].map((column) => {
              const isVisible = visibleColumns.includes(column.id);
              return (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  checked={isVisible}
                  onCheckedChange={() => onToggleColumn(column.id)}
                >
                  {typeof column.header === 'string'
                    ? column.header
                    : column.id}
                </DropdownMenuCheckboxItem>
              );
            })}
            {groups.length > 1 && <DropdownMenuSeparator />}
          </div>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem
          checked={visibleColumns.length === columns.length}
          onCheckedChange={() => {
            if (visibleColumns.length === columns.length) {
              // Deselect all
              visibleColumns.forEach((id) => onToggleColumn(id));
            } else {
              // Select all
              columns.forEach((col) => {
                if (!visibleColumns.includes(col.id)) {
                  onToggleColumn(col.id);
                }
              });
            }
          }}
        >
          Select all
        </DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem onCheckedChange={onReset}>
          Reset to defaults
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
